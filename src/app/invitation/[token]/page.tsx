import { prisma } from "@/lib/prisma";
import InvitationForm from "./InvitationForm";

export const metadata = { title: "Invitation — Podium" };

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await prisma.user.findUnique({ where: { invitationToken: token } });
  const valid = user && user.invitationExpiresAt && user.invitationExpiresAt > new Date();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏆</div>
          <h1 className="text-2xl font-bold text-white">
            <span className="text-indigo-400">Podium</span>
          </h1>
        </div>
        <div className="card-pad">
          {valid ? (
            <>
              <h2 className="section-title mb-1">Bienvenue {user.firstName} !</h2>
              <p className="text-sm text-slate-500 mb-4">
                Choisissez un mot de passe pour activer votre compte{" "}
                <strong>{user.email}</strong>.
              </p>
              <InvitationForm token={token} />
            </>
          ) : (
            <p className="text-sm text-red-600">
              Cette invitation est invalide ou expirée. Contactez l’administrateur
              pour en recevoir une nouvelle.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
