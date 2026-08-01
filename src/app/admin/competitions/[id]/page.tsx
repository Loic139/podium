import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  setCompetitionStatus,
  assignJudge,
  unassignJudge,
  validateRound,
  unvalidateRound,
} from "@/lib/actions/admin";
import { formatDate, formatDateTime } from "@/lib/format";
import { isRoundPublished } from "@/lib/scoring";
import { youtubeThumbnail } from "@/lib/youtube";
import StatusBadge from "@/components/StatusBadge";

export default async function AdminCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      rounds: { orderBy: { number: "asc" } },
      apparatus: {
        include: { apparatus: true, round: true },
        orderBy: { order: "asc" },
      },
      judgeAssignments: { include: { judge: true, apparatus: true } },
      registrations: {
        include: {
          gymnast: { include: { club: true } },
          category: true,
          performances: { include: { scores: true } },
        },
      },
    },
  });
  if (!competition) notFound();

  const judges = await prisma.user.findMany({
    where: { role: "JUGE", active: true },
    orderBy: { lastName: "asc" },
  });

  // Avancement du jugement par engin
  const judgesForApparatus = (apparatusId: string) =>
    competition.judgeAssignments.filter((ja) => ja.apparatusId === apparatusId);

  const progress = competition.apparatus.map((ca) => {
    // Un engin à deux passages (saut) attend deux notes par juge
    const attempts = ca.apparatus.twoAttempts ? 2 : 1;
    const expected = judgesForApparatus(ca.apparatusId).length * attempts;
    const perfs = competition.registrations.flatMap((r) =>
      r.performances.filter((p) => p.competitionApparatusId === ca.id)
    );
    const submitted = perfs.filter((p) => p.videoUrl).length;
    const scoresGiven = perfs.reduce((s, p) => s + p.scores.length, 0);
    const scoresExpected = perfs.filter((p) => p.videoUrl).length * expected;
    return { ca, submitted, total: competition.registrations.length, scoresGiven, scoresExpected };
  });

  const statusLabel = { DRAFT: "Brouillon", ACTIVE: "Active", ARCHIVED: "Archivée" } as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/competitions" className="text-sm text-indigo-600 hover:underline">
            ← Compétitions
          </Link>
          <h1 className="page-title mt-1">{competition.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {competition.year} · {statusLabel[competition.status]} ·{" "}
            {competition.gender === "M"
              ? "Concours garçons"
              : competition.gender === "F"
                ? "Concours filles"
                : "Concours mixte"}{" "}
            ·{" "}
            {competition.scoringMethod === "AVERAGE"
              ? "Moyenne des notes"
              : "Moyenne tronquée (sans min/max)"}{" "}
            · Catégories :{" "}
            {competition.categories.map((cc) => cc.category.code).join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          {competition.status === "DRAFT" && (
            <form action={setCompetitionStatus}>
              <input type="hidden" name="id" value={competition.id} />
              <input type="hidden" name="status" value="ACTIVE" />
              <button className="btn-primary">Publier la compétition</button>
            </form>
          )}
          {competition.status === "ACTIVE" && (
            <form action={setCompetitionStatus}>
              <input type="hidden" name="id" value={competition.id} />
              <input type="hidden" name="status" value="ARCHIVED" />
              <button className="btn-secondary">Archiver</button>
            </form>
          )}
          <Link href={`/competitions/${competition.id}`} className="btn-secondary">
            Vue publique
          </Link>
        </div>
      </div>

      {/* Semaines : calendrier + validation */}
      <section>
        <h2 className="section-title mb-3">Semaines & publication des résultats</h2>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Semaine</th>
                <th>Engin(s)</th>
                <th>Upload</th>
                <th>Jugement jusqu’au</th>
                <th>Publication</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {competition.rounds.map((r) => {
                const roundApparatus = competition.apparatus.filter(
                  (ca) => ca.roundId === r.id
                );
                const published = isRoundPublished(r);
                return (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.number}</td>
                    <td>{roundApparatus.map((ca) => ca.apparatus.name).join(", ") || "—"}</td>
                    <td className="text-slate-500">
                      {formatDate(r.uploadStart)} → {formatDate(r.uploadEnd)}
                    </td>
                    <td className="text-slate-500">{formatDateTime(r.judgingEnd)}</td>
                    <td className="text-slate-500">{formatDateTime(r.publicationAt)}</td>
                    <td>
                      {published ? (
                        <span className="badge-green">Publié</span>
                      ) : r.validatedAt ? (
                        <span className="badge-blue">Validé — publication programmée</span>
                      ) : (
                        <span className="badge-amber">Non validé</span>
                      )}
                    </td>
                    <td className="text-right">
                      {r.validatedAt ? (
                        <form action={unvalidateRound}>
                          <input type="hidden" name="roundId" value={r.id} />
                          <button className="btn-secondary btn-sm">Annuler la validation</button>
                        </form>
                      ) : (
                        <form action={validateRound}>
                          <input type="hidden" name="roundId" value={r.id} />
                          <button className="btn-primary btn-sm">Valider les résultats</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Les résultats ne sont visibles publiquement que si la semaine est
          validée ET que l’heure de publication est passée.
        </p>
      </section>

      {/* Assignation des juges */}
      <section>
        <h2 className="section-title mb-3">Juges par engin</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competition.apparatus.map((ca) => {
            const assigned = judgesForApparatus(ca.apparatusId);
            const available = judges.filter(
              (j) => !assigned.some((a) => a.judgeId === j.id)
            );
            return (
              <div key={ca.id} className="card-pad">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{ca.apparatus.name}</h3>
                  <span
                    className={
                      assigned.length >= competition.judgesPerApparatus
                        ? "badge-green"
                        : "badge-amber"
                    }
                  >
                    {assigned.length}/{competition.judgesPerApparatus} juge{competition.judgesPerApparatus > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="space-y-1 mb-3">
                  {assigned.map((ja) => (
                    <li key={ja.id} className="flex items-center justify-between text-sm">
                      <span>{ja.judge.firstName} {ja.judge.lastName}</span>
                      <form action={unassignJudge}>
                        <input type="hidden" name="id" value={ja.id} />
                        <button className="text-red-500 hover:text-red-700 text-xs">Retirer</button>
                      </form>
                    </li>
                  ))}
                  {assigned.length === 0 && (
                    <li className="text-xs text-slate-400">Aucun juge assigné.</li>
                  )}
                </ul>
                {available.length > 0 && (
                  <form action={assignJudge} className="flex gap-2">
                    <input type="hidden" name="competitionId" value={competition.id} />
                    <input type="hidden" name="apparatusId" value={ca.apparatusId} />
                    <select name="judgeId" className="input text-xs">
                      {available.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.firstName} {j.lastName}
                        </option>
                      ))}
                    </select>
                    <button className="btn-secondary btn-sm shrink-0">Assigner</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Avancement */}
      <section>
        <h2 className="section-title mb-3">Avancement</h2>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Engin</th>
                <th className="text-right">Vidéos soumises</th>
                <th className="text-right">Notes saisies</th>
                <th>Progression du jugement</th>
              </tr>
            </thead>
            <tbody>
              {progress.map(({ ca, submitted, total, scoresGiven, scoresExpected }) => (
                <tr key={ca.id}>
                  <td className="font-medium">{ca.apparatus.name}</td>
                  <td className="text-right">{submitted}/{total}</td>
                  <td className="text-right">{scoresGiven}/{scoresExpected || "—"}</td>
                  <td className="w-48">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500"
                        style={{
                          width: scoresExpected
                            ? `${Math.min(100, (scoresGiven / scoresExpected) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Vidéos soumises */}
      <section>
        <h2 className="section-title mb-3">
          Vidéos soumises ({competition.registrations.flatMap((r) => r.performances).filter((p) => p.videoUrl).length})
        </h2>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Gymnaste</th>
                <th>Club</th>
                <th>Cat.</th>
                <th>Engin</th>
                <th>Vidéo</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {competition.registrations.flatMap((reg) =>
                reg.performances
                  .filter((p) => p.videoUrl)
                  .map((p) => {
                    const ca = competition.apparatus.find(
                      (x) => x.id === p.competitionApparatusId
                    );
                    const thumb = youtubeThumbnail(p.videoUrl);
                    return (
                      <tr key={p.id}>
                        <td className="font-medium">
                          {reg.gymnast.firstName} {reg.gymnast.lastName}
                        </td>
                        <td className="text-slate-500">{reg.gymnast.club.name}</td>
                        <td><span className="badge-gray">{reg.category.code}</span></td>
                        <td>{ca?.apparatus.name}</td>
                        <td>
                          <a
                            href={p.videoUrl!}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-indigo-600 hover:underline"
                          >
                            {thumb && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" className="h-8 w-14 rounded object-cover" />
                            )}
                            Ouvrir
                            {p.videoUrl2 && " (saut 1 + saut 2)"}
                          </a>
                        </td>
                        <td><StatusBadge status={p.status} /></td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
