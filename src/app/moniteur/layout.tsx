import { requireRole } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Moniteur — Podium" };

export default async function MoniteurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("MONITEUR");
  return <AppShell user={user}>{children}</AppShell>;
}
