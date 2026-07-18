import { prisma } from "@/lib/prisma";
import { inviteUser, toggleUser, generateInvitation } from "@/lib/actions/admin";
import CopyField from "@/components/CopyField";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MONITEUR: "Moniteur",
  JUGE: "Juge",
};

export default async function UsersPage() {
  const [users, clubs] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { lastName: "asc" }],
      include: { club: true },
    }),
    prisma.club.findMany({ orderBy: { name: "asc" } }),
  ]);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <div>
      <h1 className="page-title mb-6">Utilisateurs</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Club</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="text-slate-500">{u.email}</td>
                  <td>
                    <span className="badge-indigo">{ROLE_LABEL[u.role]}</span>
                  </td>
                  <td className="text-slate-500">{u.club?.name ?? "—"}</td>
                  <td>
                    {!u.active ? (
                      <span className="badge-red">Désactivé</span>
                    ) : u.passwordHash ? (
                      <span className="badge-green">Actif</span>
                    ) : u.invitationToken ? (
                      <span className="badge-amber" title={`${appUrl}/invitation/${u.invitationToken}`}>
                        Invitation en attente
                      </span>
                    ) : (
                      <span className="badge-gray">Sans accès</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.invitationToken && (
                        <CopyField value={`${appUrl}/invitation/${u.invitationToken}`} />
                      )}
                      {!u.passwordHash && u.active && (
                        <form action={generateInvitation}>
                          <input type="hidden" name="id" value={u.id} />
                          <button className="btn-primary btn-sm">
                            {u.invitationToken ? "Renouveler" : "Inviter"}
                          </button>
                        </form>
                      )}
                      <form action={toggleUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <button className="btn-secondary btn-sm">
                          {u.active ? "Désactiver" : "Réactiver"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-pad h-fit">
          <h2 className="section-title mb-1">Inviter un utilisateur</h2>
          <p className="text-xs text-slate-400 mb-3">
            MVP : le lien d’invitation s’affiche dans la liste (pas d’envoi
            d’email réel). Validité 7 jours.
          </p>
          <form action={inviteUser} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <input name="firstName" required className="input" />
              </div>
              <div>
                <label className="label">Nom</label>
                <input name="lastName" required className="input" />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" required className="input" />
            </div>
            <div>
              <label className="label">Rôle</label>
              <select name="role" className="input">
                <option value="MONITEUR">Moniteur</option>
                <option value="JUGE">Juge</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Club (pour moniteur)</label>
              <select name="clubId" className="input">
                <option value="">—</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary w-full">Inviter</button>
          </form>
        </div>
      </div>
    </div>
  );
}
