import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGymnast } from "@/lib/actions/moniteur";

export default async function GymnastsPage() {
  const session = await requireRole("MONITEUR");
  if (!session.clubId) return null;

  const gymnasts = await prisma.gymnast.findMany({
    where: { clubId: session.clubId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { _count: { select: { registrations: true } } },
  });

  return (
    <div>
      <h1 className="page-title mb-6">Gymnastes du club</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Année</th>
                <th className="text-right">Participations</th>
              </tr>
            </thead>
            <tbody>
              {gymnasts.map((g) => (
                <tr key={g.id}>
                  <td className="font-medium">{g.lastName}</td>
                  <td>{g.firstName}</td>
                  <td className="text-slate-500">{g.birthYear ?? "—"}</td>
                  <td className="text-right">{g._count.registrations}</td>
                </tr>
              ))}
              {gymnasts.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-slate-400 py-6">
                    Aucun gymnaste. Ajoutez-en un ci-contre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-pad h-fit">
          <h2 className="section-title mb-3">Ajouter un gymnaste</h2>
          <form action={createGymnast} className="space-y-3">
            <div>
              <label className="label">Prénom</label>
              <input name="firstName" required className="input" />
            </div>
            <div>
              <label className="label">Nom</label>
              <input name="lastName" required className="input" />
            </div>
            <div>
              <label className="label">Année de naissance</label>
              <input name="birthYear" type="number" min={1950} max={2030} className="input" />
            </div>
            <button className="btn-primary w-full">Ajouter</button>
          </form>
        </div>
      </div>
    </div>
  );
}
