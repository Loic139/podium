import { prisma } from "@/lib/prisma";
import { createCompetition } from "@/lib/actions/admin";

export default async function NewCompetitionPage() {
  const [categories, apparatus] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.apparatus.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="page-title mb-6">Nouvelle compétition</h1>
      <form action={createCompetition} className="space-y-6">
        <div className="card-pad space-y-4">
          <h2 className="section-title">Informations générales</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nom</label>
              <input name="name" required className="input" placeholder="Championnat Podium 2026" />
            </div>
            <div>
              <label className="label">Année</label>
              <input name="year" type="number" required defaultValue={new Date().getFullYear()} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" rows={2} className="input" />
          </div>
          <div>
            <label className="label">Concours</label>
            <select name="gender" className="input" required defaultValue="">
              <option value="" disabled>Choisir…</option>
              <option value="M">Garçons</option>
              <option value="F">Filles</option>
              <option value="MIXTE">Mixte (sans restriction)</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Mode de calcul des notes</label>
              <select name="scoringMethod" className="input">
                <option value="AVERAGE">Moyenne des notes</option>
                <option value="TRIMMED_AVERAGE">
                  Moyenne sans meilleure ni moins bonne note
                </option>
              </select>
            </div>
            <div>
              <label className="label">Juges par engin</label>
              <input name="judgesPerApparatus" type="number" min={1} max={10} defaultValue={2} className="input" />
            </div>
          </div>
        </div>

        <div className="card-pad space-y-4">
          <h2 className="section-title">Catégories</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" name="categoryIds" value={c.id} />
                {c.code}
              </label>
            ))}
          </div>
        </div>

        <div className="card-pad space-y-4">
          <h2 className="section-title">Engins</h2>
          <p className="text-xs text-slate-400">
            L’ordre des engins suit l’ordre ci-dessous ; chaque engin est
            affecté à une semaine dans cet ordre.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {apparatus.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" name="apparatusIds" value={a.id} defaultChecked />
                {a.name}
                {a.twoAttempts && <span className="badge-gray ml-auto">2 sauts</span>}
              </label>
            ))}
          </div>
        </div>

        <div className="card-pad space-y-4">
          <h2 className="section-title">Calendrier</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Début (première semaine)</label>
              <input name="startDate" type="date" required className="input" />
            </div>
            <div>
              <label className="label">Nombre de semaines</label>
              <input name="weeks" type="number" min={1} max={20} defaultValue={5} className="input" />
            </div>
            <div>
              <label className="label">Jours pour envoyer la vidéo</label>
              <input name="uploadDays" type="number" min={1} max={14} defaultValue={5} className="input" />
            </div>
            <div>
              <label className="label">Jours pour juger</label>
              <input name="judgingDays" type="number" min={1} max={14} defaultValue={2} className="input" />
            </div>
            <div>
              <label className="label">Heure de publication</label>
              <input name="publicationTime" type="time" defaultValue="18:00" className="input" />
            </div>
          </div>
        </div>

        <button className="btn-primary">Créer la compétition (brouillon)</button>
      </form>
    </div>
  );
}
