import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MoniteurCompetitionsPage() {
  const session = await requireRole("MONITEUR");

  const competitions = await prisma.competition.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: {
      registrations: { where: { gymnast: { clubId: session.clubId ?? "" } } },
    },
  });

  return (
    <div>
      <h1 className="page-title mb-6">Compétitions</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {competitions.map((c) => (
          <Link
            key={c.id}
            href={`/moniteur/competitions/${c.id}`}
            className="card-pad hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              {c.status === "ACTIVE" ? (
                <span className="badge-green">En cours</span>
              ) : (
                <span className="badge-gray">Terminée</span>
              )}
              <span className="text-xs text-slate-400">{c.year}</span>
            </div>
            <h3 className="font-semibold mb-1">{c.name}</h3>
            <p className="text-sm text-slate-600">
              {c.registrations.length} inscrit{c.registrations.length > 1 ? "s" : ""} de votre club
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
