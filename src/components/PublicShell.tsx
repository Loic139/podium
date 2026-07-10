import Link from "next/link";
import { getSession, homeForRole } from "@/lib/auth";

export default async function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold tracking-tight">
              🏆 <span className="text-indigo-400">Podium</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/" className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-800">
                Accueil
              </Link>
              <Link href="/competitions" className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-800">
                Compétitions
              </Link>
            </nav>
          </div>
          {session ? (
            <Link href={homeForRole(session.role)} className="btn btn-sm bg-indigo-600 text-white hover:bg-indigo-700">
              Mon espace
            </Link>
          ) : (
            <Link href="/login" className="btn btn-sm border border-slate-600 text-slate-300 hover:bg-slate-800">
              Connexion
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">{children}</main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Podium — Compétitions de gymnastique vidéo
      </footer>
    </div>
  );
}
