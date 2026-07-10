import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import PublicShell from "@/components/PublicShell";

export default async function HomePage() {
  const active = await prisma.competition.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      rounds: { orderBy: { number: "asc" } },
      _count: { select: { registrations: true } },
    },
  });

  return (
    <PublicShell>
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white px-6 py-12 sm:px-10 sm:py-16 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Compétitions de gymnastique <span className="text-indigo-400">en ligne</span>
        </h1>
        <p className="text-slate-300 max-w-2xl mb-6">
          Les gymnastes filment leurs prestations, les juges notent à distance,
          les classements évoluent semaine après semaine.
        </p>
        <Link href="/competitions" className="btn bg-indigo-500 text-white hover:bg-indigo-400">
          Voir les compétitions
        </Link>
      </section>

      <h2 className="section-title mb-4">Compétitions en cours</h2>
      {active.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune compétition active pour le moment.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((c) => {
            const first = c.rounds[0];
            const last = c.rounds[c.rounds.length - 1];
            return (
              <Link key={c.id} href={`/competitions/${c.id}`} className="card-pad hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge-green">En cours</span>
                  <span className="text-xs text-slate-400">{c.year}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{c.name}</h3>
                {first && last && (
                  <p className="text-xs text-slate-500 mb-2">
                    Du {formatDate(first.uploadStart)} au {formatDate(last.publicationAt)}
                  </p>
                )}
                <p className="text-sm text-slate-600">
                  {c._count.registrations} participant{c._count.registrations > 1 ? "s" : ""} ·{" "}
                  {c.rounds.length} semaine{c.rounds.length > 1 ? "s" : ""}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </PublicShell>
  );
}
