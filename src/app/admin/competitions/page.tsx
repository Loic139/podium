import Link from "next/link";
import { prisma } from "@/lib/prisma";

const statusBadge = { DRAFT: "badge-gray", ACTIVE: "badge-green", ARCHIVED: "badge-gray" } as const;
const statusLabel = { DRAFT: "Brouillon", ACTIVE: "Active", ARCHIVED: "Archivée" } as const;

export default async function AdminCompetitionsPage() {
  const competitions = await prisma.competition.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { registrations: true } },
      rounds: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Compétitions</h1>
        <Link href="/admin/competitions/new" className="btn-primary">
          + Nouvelle compétition
        </Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Année</th>
              <th>Statut</th>
              <th className="text-right">Inscrits</th>
              <th className="text-right">Semaines</th>
              <th className="text-right">Validées</th>
            </tr>
          </thead>
          <tbody>
            {competitions.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/competitions/${c.id}`} className="font-medium text-indigo-600 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td>{c.year}</td>
                <td><span className={statusBadge[c.status]}>{statusLabel[c.status]}</span></td>
                <td className="text-right">{c._count.registrations}</td>
                <td className="text-right">{c.rounds.length}</td>
                <td className="text-right">
                  {c.rounds.filter((r) => r.validatedAt).length}/{c.rounds.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
