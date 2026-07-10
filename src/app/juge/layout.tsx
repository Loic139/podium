import { requireRole } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Juge — Podium" };

export default async function JugeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("JUGE");
  return <AppShell user={user}>{children}</AppShell>;
}
