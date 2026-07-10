import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

const NAV: Record<string, { href: string; label: string }[]> = {
  ADMIN: [
    { href: "/admin", label: "Tableau de bord" },
    { href: "/admin/competitions", label: "Compétitions" },
    { href: "/admin/categories", label: "Catégories" },
    { href: "/admin/engins", label: "Engins" },
    { href: "/admin/deductions", label: "Déductions" },
    { href: "/admin/clubs", label: "Clubs" },
    { href: "/admin/utilisateurs", label: "Utilisateurs" },
  ],
  MONITEUR: [
    { href: "/moniteur", label: "Mon club" },
    { href: "/moniteur/gymnastes", label: "Gymnastes" },
    { href: "/moniteur/competitions", label: "Compétitions" },
  ],
  JUGE: [{ href: "/juge", label: "Prestations à juger" }],
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MONITEUR: "Moniteur",
  JUGE: "Juge",
};

export default function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const nav = NAV[user.role] ?? [];
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="font-bold tracking-tight whitespace-nowrap">
              🏆 <span className="text-indigo-400">Podium</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:block text-sm text-slate-300">
              {user.firstName} {user.lastName}
              <span className="ml-2 badge bg-slate-700 text-slate-200">
                {ROLE_LABEL[user.role]}
              </span>
            </span>
            <form action={logout}>
              <button className="btn btn-sm border border-slate-600 text-slate-300 hover:bg-slate-800">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
        {/* Navigation mobile */}
        <nav className="md:hidden flex overflow-x-auto border-t border-slate-800 px-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm text-slate-300 whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
