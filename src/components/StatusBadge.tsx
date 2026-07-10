import type { PerformanceStatus } from "@prisma/client";

const CONFIG: Record<PerformanceStatus | "PUBLISHED", { label: string; cls: string }> = {
  MISSING: { label: "Manquant", cls: "badge-red" },
  SUBMITTED: { label: "Soumis", cls: "badge-blue" },
  JUDGING: { label: "En jugement", cls: "badge-amber" },
  JUDGED: { label: "Jugé", cls: "badge-indigo" },
  PUBLISHED: { label: "Publié", cls: "badge-green" },
};

export default function StatusBadge({
  status,
}: {
  status: PerformanceStatus | "PUBLISHED";
}) {
  const c = CONFIG[status];
  return <span className={c.cls}>{c.label}</span>;
}
