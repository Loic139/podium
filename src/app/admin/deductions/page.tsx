import { prisma } from "@/lib/prisma";
import { createDeduction, toggleDeduction } from "@/lib/actions/admin";

export default async function DeductionsPage() {
  const [deductions, apparatus] = await Promise.all([
    prisma.deductionType.findMany({
      orderBy: { name: "asc" },
      include: { apparatus: { include: { apparatus: true } } },
    }),
    prisma.apparatus.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="page-title mb-1">Déductions</h1>
      <p className="text-sm text-slate-500 mb-6">
        Déductions globales, valables pour toutes les compétitions. Sans engin
        coché, la déduction s’applique à tous les engins.
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th className="text-right">Valeur</th>
                <th>Engins</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deductions.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.name}</td>
                  <td className="text-right tabular-nums">
                    −{Number(d.value).toFixed(1)}
                    {d.maxValue && <> à −{Number(d.maxValue).toFixed(1)}</>}
                  </td>
                  <td>
                    {d.apparatus.length === 0 ? (
                      <span className="text-slate-400 text-xs">Tous</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {d.apparatus.map((da) => (
                          <span key={da.apparatusId} className="badge-gray">
                            {da.apparatus.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    {d.active ? (
                      <span className="badge-green">Active</span>
                    ) : (
                      <span className="badge-gray">Inactive</span>
                    )}
                  </td>
                  <td className="text-right">
                    <form action={toggleDeduction}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="btn-secondary btn-sm">
                        {d.active ? "Désactiver" : "Activer"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-pad h-fit">
          <h2 className="section-title mb-3">Ajouter une déduction</h2>
          <form action={createDeduction} className="space-y-3">
            <div>
              <label className="label">Nom</label>
              <input name="name" required className="input" placeholder="Chute" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Valeur</label>
                <input name="value" required type="number" step="0.1" min="0.1" max="10" className="input" placeholder="0.5" />
              </div>
              <div>
                <label className="label">Max (fourchette)</label>
                <input name="maxValue" type="number" step="0.1" min="0.1" max="10" className="input" placeholder="optionnel" />
              </div>
            </div>
            <div>
              <label className="label">Engins applicables</label>
              <div className="space-y-1">
                {apparatus.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="apparatusIds" value={a.id} />
                    {a.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">Aucun coché = tous les engins.</p>
            </div>
            <button className="btn-primary w-full">Ajouter</button>
          </form>
        </div>
      </div>
    </div>
  );
}
