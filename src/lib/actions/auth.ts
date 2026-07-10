"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, homeForRole } from "@/lib/auth";

export type AuthState = { error?: string };

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email et mot de passe requis." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !user.passwordHash) {
    return { error: "Identifiants invalides." };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Identifiants invalides." };

  await createSession({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    clubId: user.clubId,
  });
  redirect(homeForRole(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function acceptInvitation(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (password !== confirm) return { error: "Les mots de passe ne correspondent pas." };

  const user = await prisma.user.findUnique({ where: { invitationToken: token } });
  if (!user || !user.invitationExpiresAt || user.invitationExpiresAt < new Date()) {
    return { error: "Invitation invalide ou expirée." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, invitationToken: null, invitationExpiresAt: null },
  });

  await createSession({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    clubId: user.clubId,
  });
  redirect(homeForRole(user.role));
}
