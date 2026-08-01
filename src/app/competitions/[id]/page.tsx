import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeCompetitionResults, rankingForApparatus, type GymnastResult } from "@/lib/scoring";
import { formatScore, formatDateTime } from "@/lib/format";
import PublicShell from "@/components/PublicShell";

export const metadata = { title: "Résultats — Podium" };

function ResultsTable({
  results,
  apparatusList,
  showCategory,
}: {
  results: GymnastResult[];
  apparatusList: { competitionApparatusId: string; name: string }[];
  showCategory?: boolean;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th className="w-12">Rang</th>
            <th>Gymnaste</th>
            <th>Club</th>
            {showCategory && <th>Catégorie</th>}
            {apparatusList.map((a) => (
              <th key={a.competitionApparatusId} className="text-right">{a.name}</th>
            ))}
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.registrationId}>
              <td className="font-semibold">
                {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
              </td>
              <td className="font-medium text-slate-900">
                {r.firstName} {r.lastName}
              </td>
              <td className="text-slate-500">{r.clubName}</td>
              {showCategory && <td><span className="badge-gray">{r.categoryCode}</span></td>}
              {apparatusList.map((a) => {
                const ap = r.apparatus.find(
                  (x) => x.competitionApparatusId === a.competitionApparatusId
                );
                return (
                  <td key={a.competitionApparatusId} className="text-right tabular-nums">
                    {ap?.forfeit ? (
                      <span className="text-red-500">0.00</span>
                    ) : (
                      formatScore(ap?.score)
                    )}
                  </td>
                );
              })}
              <td className="text-right font-semibold tabular-nums">{formatScore(r.total)}</td>
            </tr>
          ))}
          {results.length === 0 && (
            <tr>
              <td colSpan={4 + apparatusList.length} className="text-center text-slate-400 py-6">
                Aucun résultat publié pour l’instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function CompetitionResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vue?: string; cat?: string; engin?: string }>;
}) {
  const { id } = await params;
  const { vue = "categorie", cat, engin } = await searchParams;

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: { rounds: { orderBy: { number: "asc" } } },
  });
  if (!competition || competition.status === "DRAFT") notFound();

  const results = await computeCompetitionResults(id, { publicOnly: true });
  if (!results) notFound();

  const categories = [...results.byCategory.entries()].sort(([, a], [, b]) =>
    a.categoryCode.localeCompare(b.categoryCode)
  );
  const nextRound = competition.rounds.find(
    (r) => !r.validatedAt || r.publicationAt.getTime() > Date.now()
  );

  const tabs = [
    { key: "categorie", label: "Par catégorie" },
    { key: "general", label: "Classement général" },
    { key: "engin", label: "Par engin" },
  ];

  return (
    <PublicShell>
      <div className="mb-6">
        <Link href="/competitions" className="text-sm text-indigo-600 hover:underline">
          ← Toutes les compétitions
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="page-title">{competition.name}</h1>
          {competition.gender === "M" && <span className="badge-blue">Garçons</span>}
          {competition.gender === "F" && <span className="badge-indigo">Filles</span>}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {competition.status === "ACTIVE" ? (
            <>
              Compétition en cours
              {nextRound && (
                <> · prochaine publication : {formatDateTime(nextRound.publicationAt)}</>
              )}
            </>
          ) : (
            "Compétition terminée"
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/competitions/${id}?vue=${t.key}`}
            className={
              vue === t.key
                ? "btn btn-sm bg-slate-900 text-white"
                : "btn-secondary btn-sm"
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {results.apparatusList.length === 0 ? (
        <div className="card-pad text-sm text-slate-500">
          Aucun résultat publié pour l’instant. Les résultats apparaissent une
          fois validés et l’heure de publication passée.
        </div>
      ) : vue === "general" ? (
        <ResultsTable
          results={results.general}
          apparatusList={results.apparatusList}
          showCategory
        />
      ) : vue === "engin" ? (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {results.apparatusList.map((a) => (
              <Link
                key={a.competitionApparatusId}
                href={`/competitions/${id}?vue=engin&engin=${a.competitionApparatusId}`}
                className={
                  (engin ?? results.apparatusList[0]?.competitionApparatusId) ===
                  a.competitionApparatusId
                    ? "btn btn-sm bg-indigo-600 text-white"
                    : "btn-secondary btn-sm"
                }
              >
                {a.name}
              </Link>
            ))}
          </div>
          {(() => {
            const selected =
              engin ?? results.apparatusList[0]?.competitionApparatusId;
            const rows = rankingForApparatus(results, selected);
            return (
              <div className="card overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th className="w-12">Rang</th>
                      <th>Gymnaste</th>
                      <th>Club</th>
                      <th>Catégorie</th>
                      <th className="text-right">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.result.registrationId}>
                        <td className="font-semibold">{i + 1}</td>
                        <td className="font-medium">
                          {row.result.firstName} {row.result.lastName}
                        </td>
                        <td className="text-slate-500">{row.result.clubName}</td>
                        <td><span className="badge-gray">{row.result.categoryCode}</span></td>
                        <td className="text-right font-semibold tabular-nums">
                          {formatScore(row.score)}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-slate-400 py-6">
                          Aucune note publiée pour cet engin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map(([catId, entry]) => (
              <Link
                key={catId}
                href={`/competitions/${id}?vue=categorie&cat=${catId}`}
                className={
                  (cat ?? categories[0]?.[0]) === catId
                    ? "btn btn-sm bg-indigo-600 text-white"
                    : "btn-secondary btn-sm"
                }
              >
                {entry.categoryCode}
              </Link>
            ))}
          </div>
          {(() => {
            const selected = cat ?? categories[0]?.[0];
            const entry = selected ? results.byCategory.get(selected) : undefined;
            return entry ? (
              <ResultsTable results={entry.results} apparatusList={results.apparatusList} />
            ) : (
              <p className="text-sm text-slate-500">Aucune catégorie.</p>
            );
          })()}
        </>
      )}
    </PublicShell>
  );
}
