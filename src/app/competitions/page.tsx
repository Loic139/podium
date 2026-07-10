import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PublicShell from "@/components/PublicShell";

export const metadata = { title: "Compétitions — Podium" };

export default async function CompetitionsPage() {
  const competitions = await prisma.competition.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { registrations: true } }, rounds: true },
  });

  const byYear = new Map<number, typeof competitions>();
  for (const c of competitions) {
    if (!byYear.has(c.year)) byYear.set(c.year, []);
    byYear.get(c.year)!.push(c);
  }

  return (
    <PublicShell>
      <h1 className="page-title mb-6">Compétitions</h1>
      {[...byYear.entries()].map(([year, list]) => (
        <section key={year} className="mb-8">
          <h2 className="section-title mb-3">{year}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <Link key={c.id} href={`/competitions/${c.id}`} className="card-pad hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  {c.status === "ACTIVE" ? (
                    <span className="badge-green">En cours</span>
                  ) : (
                    <span className="badge-gray">Terminée</span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{c.name}</h3>
                <p className="text-sm text-slate-600">
                  {c._count.registrations} participant{c._count.registrations > 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {competitions.length === 0 && (
        <p className="text-sm text-slate-500">Aucune compétition publiée.</p>
      )}
    </PublicShell>
  );
}
