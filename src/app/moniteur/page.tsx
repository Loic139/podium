import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MoniteurDashboard() {
  const session = await requireRole("MONITEUR");
  if (!session.clubId) {
    return (
      <div className="card-pad text-sm text-slate-500">
        Aucun club associé à votre compte. Contactez l’administrateur.
      </div>
    );
  }

  const [club, activeCompetitions] = await Promise.all([
    prisma.club.findUnique({
      where: { id: session.clubId },
      include: {
        gymnasts: { orderBy: { lastName: "asc" } },
        moniteurs: { where: { active: true } },
      },
    }),
    prisma.competition.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        registrations: {
          where: { gymnast: { clubId: session.clubId } },
        },
        rounds: { orderBy: { number: "asc" } },
      },
    }),
  ]);

  if (!club) return null;

  return (
    <div>
      <h1 className="page-title mb-6">{club.name}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link href="/moniteur/gymnastes" className="card-pad hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold">{club.gymnasts.length}</div>
          <div className="text-sm text-slate-500">Gymnastes</div>
        </Link>
        <div className="card-pad">
          <div className="text-3xl font-bold">{club.moniteurs.length}</div>
          <div className="text-sm text-slate-500">Moniteurs</div>
        </div>
        <div className="card-pad">
          <div className="text-3xl font-bold">{activeCompetitions.length}</div>
          <div className="text-sm text-slate-500">Compétitions actives</div>
        </div>
      </div>

      <h2 className="section-title mb-3">Compétitions en cours</h2>
      {activeCompetitions.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune compétition active.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeCompetitions.map((c) => (
            <Link
              key={c.id}
              href={`/moniteur/competitions/${c.id}`}
              className="card-pad hover:shadow-md transition-shadow"
            >
              <span className="badge-green mb-2">En cours</span>
              <h3 className="font-semibold mt-2 mb-1">{c.name}</h3>
              <p className="text-sm text-slate-600">
                {c.registrations.length} gymnaste{c.registrations.length > 1 ? "s" : ""} de votre club inscrit{c.registrations.length > 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
