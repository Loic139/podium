"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { Role, ScoringMethod, CompetitionStatus, Gender } from "@prisma/client";

const DAY = 24 * 60 * 60 * 1000;

// ─── Catégories ──────────────────────────────────────

export async function createCategory(formData: FormData) {
  await requireRole("ADMIN");
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return;
  await prisma.category.create({
    data: { code, name, order: await prisma.category.count() },
  });
  revalidatePath("/admin/categories");
}

export async function toggleCategory(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return;
  await prisma.category.update({ where: { id }, data: { active: !cat.active } });
  revalidatePath("/admin/categories");
}

// ─── Engins ──────────────────────────────────────────

export async function createApparatus(formData: FormData) {
  await requireRole("ADMIN");
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return;
  await prisma.apparatus.create({
    data: {
      code,
      name,
      order: await prisma.apparatus.count(),
      twoAttempts: formData.get("twoAttempts") === "on",
    },
  });
  revalidatePath("/admin/engins");
}

export async function toggleApparatus(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const a = await prisma.apparatus.findUnique({ where: { id } });
  if (!a) return;
  await prisma.apparatus.update({ where: { id }, data: { active: !a.active } });
  revalidatePath("/admin/engins");
}

// ─── Clubs ───────────────────────────────────────────

export async function createClub(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.club.create({ data: { name } });
  revalidatePath("/admin/clubs");
}

// ─── Déductions ──────────────────────────────────────

export async function createDeduction(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const value = parseFloat(String(formData.get("value")));
  const maxRaw = String(formData.get("maxValue") ?? "").trim();
  const apparatusIds = formData.getAll("apparatusIds").map(String);
  if (!name || isNaN(value) || value <= 0) return;

  await prisma.deductionType.create({
    data: {
      name,
      value: value.toFixed(1),
      maxValue: maxRaw ? parseFloat(maxRaw).toFixed(1) : null,
      apparatus: apparatusIds.length
        ? { create: apparatusIds.map((apparatusId) => ({ apparatusId })) }
        : undefined,
    },
  });
  revalidatePath("/admin/deductions");
}

export async function toggleDeduction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const d = await prisma.deductionType.findUnique({ where: { id } });
  if (!d) return;
  await prisma.deductionType.update({ where: { id }, data: { active: !d.active } });
  revalidatePath("/admin/deductions");
}

// ─── Utilisateurs & invitations ──────────────────────

export async function inviteUser(formData: FormData) {
  await requireRole("ADMIN");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const role = String(formData.get("role")) as Role;
  const clubId = String(formData.get("clubId") ?? "") || null;
  if (!email || !firstName || !lastName) return;

  const invitationToken = randomBytes(24).toString("hex");
  const invitationExpiresAt = new Date(Date.now() + 7 * DAY);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Compte déjà présent (ex. moniteur importé) : régénère le lien
    // d'invitation, sauf si le compte est déjà actif avec mot de passe.
    if (!existing.passwordHash) {
      await prisma.user.update({
        where: { email },
        data: { invitationToken, invitationExpiresAt },
      });
    }
  } else {
    await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        clubId: role === "MONITEUR" ? clubId : null,
        invitationToken,
        invitationExpiresAt,
      },
    });
  }
  // MVP : pas d'envoi d'email réel — le lien d'invitation est affiché dans la liste.
  revalidatePath("/admin/utilisateurs");
}

/** Génère (ou renouvelle) un lien d'invitation pour un utilisateur existant
 *  sans mot de passe — typiquement les moniteurs importés. */
export async function generateInvitation(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.passwordHash) return; // compte déjà actif : ne rien faire

  await prisma.user.update({
    where: { id },
    data: {
      invitationToken: randomBytes(24).toString("hex"),
      invitationExpiresAt: new Date(Date.now() + 7 * DAY),
    },
  });
  revalidatePath("/admin/utilisateurs");
}

export async function toggleUser(formData: FormData) {
  const session = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (id === session.id) return; // ne pas se désactiver soi-même
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  revalidatePath("/admin/utilisateurs");
}

// ─── Compétitions ────────────────────────────────────

export async function createCompetition(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const year = parseInt(String(formData.get("year")));
  const description = String(formData.get("description") ?? "").trim() || null;
  const scoringMethod = String(formData.get("scoringMethod")) as ScoringMethod;
  const judgesPerApparatus = parseInt(String(formData.get("judgesPerApparatus"))) || 1;
  const genderRaw = String(formData.get("gender") ?? "");
  const gender: Gender | null =
    genderRaw === "M" || genderRaw === "F" ? genderRaw : null;

  const categoryIds = formData.getAll("categoryIds").map(String);
  const apparatusIds = formData.getAll("apparatusIds").map(String);

  const startDate = new Date(String(formData.get("startDate")));
  const weeks = parseInt(String(formData.get("weeks"))) || apparatusIds.length;
  const uploadDays = parseInt(String(formData.get("uploadDays"))) || 5;
  const judgingDays = parseInt(String(formData.get("judgingDays"))) || 2;
  const publicationTime = String(formData.get("publicationTime") ?? "18:00");

  if (!name || !year || isNaN(startDate.getTime()) || categoryIds.length === 0 || apparatusIds.length === 0) {
    return;
  }

  const [pubH, pubM] = publicationTime.split(":").map(Number);

  const competition = await prisma.competition.create({
    data: {
      name,
      year,
      description,
      scoringMethod,
      judgesPerApparatus,
      gender,
      status: "DRAFT",
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });

  // Génère les semaines : upload → jugement → publication
  const rounds = [];
  for (let i = 0; i < weeks; i++) {
    const uploadStart = new Date(startDate.getTime() + i * 7 * DAY);
    const uploadEnd = new Date(uploadStart.getTime() + uploadDays * DAY);
    const judgingEnd = new Date(uploadEnd.getTime() + judgingDays * DAY);
    const publicationAt = new Date(judgingEnd);
    publicationAt.setHours(pubH ?? 18, pubM ?? 0, 0, 0);
    rounds.push(
      await prisma.competitionRound.create({
        data: {
          competitionId: competition.id,
          number: i + 1,
          uploadStart,
          uploadEnd,
          judgingEnd,
          publicationAt,
        },
      })
    );
  }

  // Engins dans l'ordre de sélection, répartis sur les semaines
  for (let i = 0; i < apparatusIds.length; i++) {
    await prisma.competitionApparatus.create({
      data: {
        competitionId: competition.id,
        apparatusId: apparatusIds[i],
        order: i,
        roundId: rounds[i % rounds.length]?.id,
      },
    });
  }

  redirect(`/admin/competitions/${competition.id}`);
}

export async function setCompetitionStatus(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as CompetitionStatus;
  await prisma.competition.update({ where: { id }, data: { status } });
  revalidatePath(`/admin/competitions/${id}`);
  revalidatePath("/admin/competitions");
}

// ─── Assignation des juges ───────────────────────────

export async function assignJudge(formData: FormData) {
  await requireRole("ADMIN");
  const competitionId = String(formData.get("competitionId"));
  const judgeId = String(formData.get("judgeId"));
  const apparatusId = String(formData.get("apparatusId"));
  if (!judgeId || !apparatusId) return;

  await prisma.judgeAssignment.upsert({
    where: {
      competitionId_judgeId_apparatusId: { competitionId, judgeId, apparatusId },
    },
    update: {},
    create: { competitionId, judgeId, apparatusId },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
}

export async function unassignJudge(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const assignment = await prisma.judgeAssignment.findUnique({ where: { id } });
  if (!assignment) return;
  await prisma.judgeAssignment.delete({ where: { id } });
  revalidatePath(`/admin/competitions/${assignment.competitionId}`);
}

// ─── Validation / publication des résultats ──────────

export async function validateRound(formData: FormData) {
  const session = await requireRole("ADMIN");
  const roundId = String(formData.get("roundId"));
  const round = await prisma.competitionRound.findUnique({ where: { id: roundId } });
  if (!round || round.validatedAt) return;

  await prisma.competitionRound.update({
    where: { id: roundId },
    data: { validatedAt: new Date() },
  });
  await prisma.resultPublication.create({
    data: {
      competitionId: round.competitionId,
      roundId,
      validatedById: session.id,
    },
  });
  revalidatePath(`/admin/competitions/${round.competitionId}`);
  revalidatePath(`/competitions/${round.competitionId}`);
}

export async function unvalidateRound(formData: FormData) {
  await requireRole("ADMIN");
  const roundId = String(formData.get("roundId"));
  const round = await prisma.competitionRound.findUnique({ where: { id: roundId } });
  if (!round) return;
  await prisma.competitionRound.update({
    where: { id: roundId },
    data: { validatedAt: null },
  });
  revalidatePath(`/admin/competitions/${round.competitionId}`);
  revalidatePath(`/competitions/${round.competitionId}`);
}
