import { prisma } from "@/lib/prisma";
import { createClub } from "@/lib/actions/admin";

export default async function ClubsPage() {
  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { gymnasts: true, moniteurs: true } },
    },
  });

  return (
    <div>
      <h1 className="page-title mb-6">Clubs</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th className="text-right">Gymnastes</th>
                <th className="text-right">Moniteurs</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-right">{c._count.gymnasts}</td>
                  <td className="text-right">{c._count.moniteurs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-pad h-fit">
          <h2 className="section-title mb-3">Ajouter un club</h2>
          <form action={createClub} className="space-y-3">
            <div>
              <label className="label">Nom</label>
              <input name="name" required className="input" placeholder="FSG Nyon" />
            </div>
            <button className="btn-primary w-full">Ajouter</button>
          </form>
        </div>
      </div>
    </div>
  );
}
