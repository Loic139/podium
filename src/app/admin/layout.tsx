import { requireRole } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Admin — Podium" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("ADMIN");
  return <AppShell user={user}>{children}</AppShell>;
}
