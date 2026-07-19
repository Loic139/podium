import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateGymnast } from "@/lib/actions/moniteur";

export default async function EditGymnastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("MONITEUR");
  const { id } = await params;

  const [gymnast, categories] = await Promise.all([
    prisma.gymnast.findUnique({ where: { id }, include: { category: true } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);
  // Un moniteur ne modifie que les gymnastes de son club
  if (!gymnast || gymnast.clubId !== session.clubId) notFound();

  return (
    <div className="max-w-md">
      <Link href="/moniteur/gymnastes" className="text-sm text-indigo-600 hover:underline">
        ← Gymnastes
      </Link>
      <h1 className="page-title mt-1 mb-6">
        Modifier {gymnast.firstName} {gymnast.lastName}
      </h1>
      <div className="card-pad">
        <form action={updateGymnast} className="space-y-3">
          <input type="hidden" name="id" value={gymnast.id} />
          <div>
            <label className="label">Prénom</label>
            <input name="firstName" required defaultValue={gymnast.firstName} className="input" />
          </div>
          <div>
            <label className="label">Nom</label>
            <input name="lastName" required defaultValue={gymnast.lastName} className="input" />
          </div>
          <div>
            <label className="label">Sexe</label>
            <select name="gender" className="input" required defaultValue={gymnast.gender ?? ""}>
              <option value="" disabled>Choisir…</option>
              <option value="M">Garçon</option>
              <option value="F">Fille</option>
            </select>
          </div>
          <div>
            <label className="label">Année de naissance</label>
            <input
              name="birthYear"
              type="number"
              min={1950}
              max={2030}
              defaultValue={gymnast.birthYear ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label">Catégorie</label>
            <select name="categoryId" className="input" required defaultValue={gymnast.categoryId ?? ""}>
              <option value="" disabled>Choisir…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
              {/* Catégorie actuelle si elle a été désactivée entre-temps */}
              {gymnast.category && !categories.some((c) => c.id === gymnast.categoryId) && (
                <option value={gymnast.category.id}>
                  {gymnast.category.code} — {gymnast.category.name} (inactive)
                </option>
              )}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn-primary flex-1">Enregistrer</button>
            <Link href="/moniteur/gymnastes" className="btn-secondary">Annuler</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
