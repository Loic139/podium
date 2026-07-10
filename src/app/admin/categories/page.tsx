import { prisma } from "@/lib/prisma";
import { createCategory, toggleCategory } from "@/lib/actions/admin";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <h1 className="page-title mb-6">Catégories</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.code}</td>
                  <td>{c.name}</td>
                  <td>
                    {c.active ? (
                      <span className="badge-green">Active</span>
                    ) : (
                      <span className="badge-gray">Inactive</span>
                    )}
                  </td>
                  <td className="text-right">
                    <form action={toggleCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="btn-secondary btn-sm">
                        {c.active ? "Désactiver" : "Activer"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-pad h-fit">
          <h2 className="section-title mb-3">Ajouter une catégorie</h2>
          <form action={createCategory} className="space-y-3">
            <div>
              <label className="label">Code</label>
              <input name="code" required className="input" placeholder="C8" />
            </div>
            <div>
              <label className="label">Nom</label>
              <input name="name" required className="input" placeholder="Catégorie C8" />
            </div>
            <button className="btn-primary w-full">Ajouter</button>
          </form>
        </div>
      </div>
    </div>
  );
}
