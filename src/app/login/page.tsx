import { redirect } from "next/navigation";
import { getSession, homeForRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LoginForm from "./LoginForm";

export const metadata = { title: "Connexion — Podium" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    // Ne redirige que si le compte existe toujours (session obsolète sinon)
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (user && user.active) redirect(homeForRole(session.role));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏆</div>
          <h1 className="text-2xl font-bold text-white">
            <span className="text-indigo-400">Podium</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Compétitions de gymnastique en ligne
          </p>
        </div>
        <div className="card-pad">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
