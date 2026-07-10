import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [competitions, users, clubs, gymnasts, pendingScores] = await Promise.all([
    prisma.competition.findMany({
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { registrations: true } },
        rounds: { orderBy: { number: "asc" } },
      },
      take: 6,
    }),
    prisma.user.count(),
    prisma.club.count(),
    prisma.gymnast.count(),
    prisma.performance.count({ where: { status: { in: ["SUBMITTED", "JUDGING"] } } }),
  ]);

  const stats = [
    { label: "Utilisateurs", value: users, href: "/admin/utilisateurs" },
    { label: "Clubs", value: clubs, href: "/admin/clubs" },
    { label: "Gymnastes", value: gymnasts, href: "/admin/clubs" },
    { label: "Prestations à juger", value: pendingScores, href: "/admin/competitions" },
  ];

  const statusBadge = { DRAFT: "badge-gray", ACTIVE: "badge-green", ARCHIVED: "badge-gray" } as const;
  const statusLabel = { DRAFT: "Brouillon", ACTIVE: "Active", ARCHIVED: "Archivée" } as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Tableau de bord</h1>
        <Link href="/admin/competitions/new" className="btn-primary">
          + Nouvelle compétition
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card-pad hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </Link>
        ))}
      </div>

      <h2 className="section-title mb-3">Compétitions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {competitions.map((c) => (
          <Link key={c.id} href={`/admin/competitions/${c.id}`} className="card-pad hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className={statusBadge[c.status]}>{statusLabel[c.status]}</span>
              <span className="text-xs text-slate-400">{c.year}</span>
            </div>
            <h3 className="font-semibold mb-1">{c.name}</h3>
            <p className="text-sm text-slate-600">
              {c._count.registrations} inscrits · {c.rounds.length} semaines
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
