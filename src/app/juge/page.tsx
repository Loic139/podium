import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { youtubeThumbnail } from "@/lib/youtube";
import StatusBadge from "@/components/StatusBadge";

export default async function JugeDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    competition?: string;
    categorie?: string;
    engin?: string;
    statut?: string;
  }>;
}) {
  const session = await requireRole("JUGE");
  const filters = await searchParams;

  const assignments = await prisma.judgeAssignment.findMany({
    where: { judgeId: session.id },
    include: { competition: true, apparatus: true },
  });

  // Prestations avec vidéo, sur les engins/compétitions assignés au juge
  const performances = await prisma.performance.findMany({
    where: {
      videoUrl: { not: null },
      OR: assignments.map((a) => ({
        registration: { competitionId: a.competitionId },
        competitionApparatus: { apparatusId: a.apparatusId },
      })),
      // Verrou : on ne juge plus une semaine validée
      competitionApparatus: { round: { validatedAt: null } },
    },
    include: {
      registration: {
        include: {
          gymnast: { include: { club: true } },
          category: true,
          competition: true,
        },
      },
      competitionApparatus: { include: { apparatus: true, round: true } },
      scores: { where: { judgeId: session.id } },
    },
    orderBy: { submittedAt: "asc" },
  });

  // Un engin à deux passages attend deux notes du juge
  const expectedScores = (p: (typeof performances)[number]) =>
    p.competitionApparatus.apparatus.twoAttempts ? 2 : 1;
  const isDone = (p: (typeof performances)[number]) =>
    p.scores.length >= expectedScores(p);

  // Filtres
  const filtered = performances.filter((p) => {
    if (filters.competition && p.registration.competitionId !== filters.competition) return false;
    if (filters.categorie && p.registration.categoryId !== filters.categorie) return false;
    if (filters.engin && p.competitionApparatus.apparatusId !== filters.engin) return false;
    if (filters.statut === "a-juger" && isDone(p)) return false;
    if (filters.statut === "jugees" && !isDone(p)) return false;
    return true;
  });

  const competitions = [...new Map(assignments.map((a) => [a.competitionId, a.competition])).values()];
  const apparatus = [...new Map(assignments.map((a) => [a.apparatusId, a.apparatus])).values()];
  const categories = [
    ...new Map(performances.map((p) => [p.registration.categoryId, p.registration.category])).values(),
  ];

  const todo = performances.filter((p) => !isDone(p)).length;

  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...filters, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/juge?${s}` : "/juge";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Prestations à juger</h1>
        <span className={todo > 0 ? "badge-amber" : "badge-green"}>
          {todo > 0 ? `${todo} en attente` : "Tout est jugé 🎉"}
        </span>
      </div>

      {/* Filtres */}
      <div className="card-pad mb-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <FilterSelect
            label="Compétition"
            current={filters.competition}
            options={competitions.map((c) => ({ value: c.id, label: c.name }))}
            hrefFor={(v) => qs({ competition: v })}
          />
          <FilterSelect
            label="Catégorie"
            current={filters.categorie}
            options={categories.map((c) => ({ value: c.id, label: c.code }))}
            hrefFor={(v) => qs({ categorie: v })}
          />
          <FilterSelect
            label="Engin"
            current={filters.engin}
            options={apparatus.map((a) => ({ value: a.id, label: a.name }))}
            hrefFor={(v) => qs({ engin: v })}
          />
          <FilterSelect
            label="Statut"
            current={filters.statut}
            options={[
              { value: "a-juger", label: "À juger" },
              { value: "jugees", label: "Jugées" },
            ]}
            hrefFor={(v) => qs({ statut: v })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const thumb = youtubeThumbnail(p.videoUrl);
          const twoAttempts = p.competitionApparatus.apparatus.twoAttempts;
          // Saut : moyenne des deux notes une fois les deux passages notés
          const myScore = isDone(p)
            ? p.scores.reduce((s, x) => s + Number(x.value), 0) / p.scores.length
            : null;
          return (
            <Link
              key={p.id}
              href={`/juge/prestations/${p.id}`}
              className="card overflow-hidden hover:shadow-md transition-shadow"
            >
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="w-full aspect-video object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="badge-indigo">{p.competitionApparatus.apparatus.name}</span>
                  {myScore !== null ? (
                    <span className="badge-green">
                      Ma note : {myScore.toFixed(2)}
                    </span>
                  ) : twoAttempts && p.scores.length === 1 ? (
                    <span className="badge-amber">Saut {p.scores[0].attempt} noté — reste 1</span>
                  ) : (
                    <StatusBadge status="SUBMITTED" />
                  )}
                </div>
                <h3 className="font-semibold">
                  {p.registration.gymnast.firstName} {p.registration.gymnast.lastName}
                </h3>
                <p className="text-sm text-slate-500">
                  {p.registration.gymnast.club.name} ·{" "}
                  <span className="badge-gray">{p.registration.category.code}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {p.registration.competition.name}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-slate-500">Aucune prestation ne correspond aux filtres.</p>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  current,
  options,
  hrefFor,
}: {
  label: string;
  current?: string;
  options: { value: string; label: string }[];
  hrefFor: (value?: string) => string;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex flex-wrap gap-1">
        <Link href={hrefFor(undefined)} className={!current ? "btn btn-sm bg-slate-900 text-white" : "btn-secondary btn-sm"}>
          Tous
        </Link>
        {options.map((o) => (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            className={current === o.value ? "btn btn-sm bg-slate-900 text-white" : "btn-secondary btn-sm"}
          >
            {o.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
