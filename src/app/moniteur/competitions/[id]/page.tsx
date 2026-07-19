import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatScore } from "@/lib/format";
import { isRoundPublished, performanceScore } from "@/lib/scoring";
import { youtubeThumbnail } from "@/lib/youtube";
import StatusBadge from "@/components/StatusBadge";
import RegisterForm from "./RegisterForm";
import VideoForm from "./VideoForm";

export default async function MoniteurCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("MONITEUR");
  const { id } = await params;
  if (!session.clubId) return null;

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true }, orderBy: { category: { order: "asc" } } },
      apparatus: {
        include: { apparatus: true, round: true },
        orderBy: { order: "asc" },
      },
      registrations: {
        where: { gymnast: { clubId: session.clubId } },
        include: {
          gymnast: true,
          category: true,
          performances: { include: { scores: true } },
        },
        orderBy: { gymnast: { lastName: "asc" } },
      },
    },
  });
  if (!competition || competition.status === "DRAFT") notFound();

  const gymnasts = await prisma.gymnast.findMany({
    where: { clubId: session.clubId },
    orderBy: { lastName: "asc" },
  });
  const notRegistered = gymnasts.filter(
    (g) => !competition.registrations.some((r) => r.gymnastId === g.id)
  );

  const now = new Date();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/moniteur/competitions" className="text-sm text-indigo-600 hover:underline">
          ← Compétitions
        </Link>
        <h1 className="page-title mt-1">{competition.name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Résultats publics :{" "}
          <Link href={`/competitions/${competition.id}`} className="text-indigo-600 hover:underline">
            voir la page de résultats
          </Link>
        </p>
      </div>

      {/* Calendrier */}
      <section className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Semaine</th>
              <th>Engin(s)</th>
              <th>Envoi des vidéos</th>
              <th>Publication</th>
            </tr>
          </thead>
          <tbody>
            {competition.apparatus
              .filter((ca) => ca.round)
              .sort((a, b) => (a.round!.number - b.round!.number))
              .map((ca) => (
                <tr key={ca.id}>
                  <td className="font-semibold">{ca.round!.number}</td>
                  <td>{ca.apparatus.name}</td>
                  <td className="text-slate-500">
                    {formatDate(ca.round!.uploadStart)} → {formatDate(ca.round!.uploadEnd)}
                    {now >= ca.round!.uploadStart && now <= ca.round!.uploadEnd && (
                      <span className="badge-green ml-2">Ouvert</span>
                    )}
                  </td>
                  <td className="text-slate-500">{formatDateTime(ca.round!.publicationAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gymnastes inscrits + vidéos */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="section-title">
            Gymnastes inscrits ({competition.registrations.length})
          </h2>
          {competition.registrations.map((reg) => (
            <div key={reg.id} className="card-pad">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  {reg.gymnast.firstName} {reg.gymnast.lastName}
                </h3>
                <span className="badge-indigo">{reg.category.code}</span>
              </div>
              <div className="space-y-3">
                {competition.apparatus.map((ca) => {
                  const perf = reg.performances.find(
                    (p) => p.competitionApparatusId === ca.id
                  );
                  const round = ca.round;
                  const uploadOpen =
                    round && now >= round.uploadStart && now <= round.uploadEnd;
                  const deadlinePassed = round && now > round.uploadEnd;
                  const published = round ? isRoundPublished(round) : false;
                  const hasScores = (perf?.scores.length ?? 0) > 0;
                  const finalScore = published
                    ? performanceScore(
                        (perf?.scores ?? []).map((s) => ({
                          value: Number(s.value),
                          attempt: s.attempt,
                        })),
                        competition.scoringMethod,
                        ca.apparatus.twoAttempts
                      )
                    : null;
                  const status =
                    published && hasScores
                      ? "PUBLISHED"
                      : perf?.status ?? "MISSING";
                  const thumb = youtubeThumbnail(perf?.videoUrl);

                  return (
                    <div
                      key={ca.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-slate-100 pt-3"
                    >
                      <div className="w-40 shrink-0">
                        <div className="font-medium text-sm">{ca.apparatus.name}</div>
                        <StatusBadge status={status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {published && finalScore !== null ? (
                          <div className="text-sm">
                            Note publiée :{" "}
                            <span className="font-semibold tabular-nums">
                              {formatScore(finalScore)}
                            </span>
                          </div>
                        ) : deadlinePassed && !perf?.videoUrl ? (
                          <p className="text-xs text-red-500">
                            Deadline passée sans vidéo — note 0.
                          </p>
                        ) : uploadOpen && !hasScores ? (
                          <VideoForm
                            registrationId={reg.id}
                            competitionApparatusId={ca.id}
                            twoAttempts={ca.apparatus.twoAttempts}
                            currentUrl={perf?.videoUrl ?? null}
                            currentUrl2={perf?.videoUrl2 ?? null}
                          />
                        ) : perf?.videoUrl ? (
                          <a
                            href={perf.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                          >
                            {thumb && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" className="h-9 w-16 rounded object-cover" />
                            )}
                            Vidéo soumise
                            {perf.videoUrl2 && " (2 sauts)"}
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Fenêtre d’envoi pas encore ouverte.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {competition.registrations.length === 0 && (
            <p className="text-sm text-slate-500">
              Aucun gymnaste de votre club inscrit pour l’instant.
            </p>
          )}
        </div>

        {/* Inscription */}
        {competition.status === "ACTIVE" && (
          <div className="card-pad h-fit">
            <h2 className="section-title mb-3">Inscrire un gymnaste</h2>
            <RegisterForm
              competitionId={competition.id}
              gymnasts={notRegistered.map((g) => ({
                id: g.id,
                firstName: g.firstName,
                lastName: g.lastName,
                categoryId: g.categoryId,
              }))}
              categories={competition.categories.map((cc) => ({
                id: cc.category.id,
                code: cc.category.code,
                name: cc.category.name,
              }))}
            />
            <p className="text-xs text-slate-400 mt-3">
              Gymnaste absent de la liste ?{" "}
              <Link href="/moniteur/gymnastes" className="text-indigo-600 hover:underline">
                Ajoutez-le d’abord ici
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
