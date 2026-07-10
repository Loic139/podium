import { prisma } from "@/lib/prisma";
import { createApparatus, toggleApparatus } from "@/lib/actions/admin";

export default async function ApparatusPage() {
  const apparatus = await prisma.apparatus.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <h1 className="page-title mb-6">Engins</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Code</th>
                <th>Deux passages</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {apparatus.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.name}</td>
                  <td className="text-slate-500 font-mono text-xs">{a.code}</td>
                  <td>{a.twoAttempts ? "Oui (saut)" : "—"}</td>
                  <td>
                    {a.active ? (
                      <span className="badge-green">Actif</span>
                    ) : (
                      <span className="badge-gray">Inactif</span>
                    )}
                  </td>
                  <td className="text-right">
                    <form action={toggleApparatus}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="btn-secondary btn-sm">
                        {a.active ? "Désactiver" : "Activer"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-pad h-fit">
          <h2 className="section-title mb-3">Ajouter un engin</h2>
          <form action={createApparatus} className="space-y-3">
            <div>
              <label className="label">Nom</label>
              <input name="name" required className="input" placeholder="Cheval d'arçons" />
            </div>
            <div>
              <label className="label">Code</label>
              <input name="code" required className="input" placeholder="POMMEL_HORSE" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="twoAttempts" />
              Deux passages notés séparément (type saut) — deux vidéos, note finale = moyenne
            </label>
            <button className="btn-primary w-full">Ajouter</button>
          </form>
        </div>
      </div>
    </div>
  );
}
