"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isValidYoutubeUrl } from "@/lib/youtube";
import type { Gender } from "@prisma/client";

export type ActionState = { error?: string; success?: string };

// ─── Gymnastes ───────────────────────────────────────

/** Extrait et valide les champs communs des formulaires gymnaste. */
function gymnastFields(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthYear = parseInt(String(formData.get("birthYear"))) || null;
  const genderRaw = String(formData.get("gender") ?? "");
  const gender: Gender | null =
    genderRaw === "M" || genderRaw === "F" ? genderRaw : null;
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  return { firstName, lastName, birthYear, gender, categoryId };
}

export async function createGymnast(formData: FormData) {
  const session = await requireRole("MONITEUR");
  if (!session.clubId) return;
  const fields = gymnastFields(formData);
  if (!fields.firstName || !fields.lastName || !fields.categoryId) return;

  await prisma.gymnast.create({
    data: { ...fields, clubId: session.clubId },
  });
  revalidatePath("/moniteur/gymnastes");
}

export async function updateGymnast(formData: FormData) {
  const session = await requireRole("MONITEUR");
  const id = String(formData.get("id"));
  const gymnast = await prisma.gymnast.findUnique({ where: { id } });
  // Un moniteur ne modifie que les gymnastes de son club
  if (!gymnast || gymnast.clubId !== session.clubId) return;

  const fields = gymnastFields(formData);
  if (!fields.firstName || !fields.lastName || !fields.categoryId) return;

  await prisma.gymnast.update({ where: { id }, data: fields });
  revalidatePath("/moniteur/gymnastes");
  redirect("/moniteur/gymnastes");
}

// ─── Inscription à une compétition ───────────────────

export async function registerGymnast(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("MONITEUR");
  const competitionId = String(formData.get("competitionId"));
  const gymnastId = String(formData.get("gymnastId"));

  // Le gymnaste doit appartenir au club du moniteur
  const gymnast = await prisma.gymnast.findUnique({ where: { id: gymnastId } });
  if (!gymnast || gymnast.clubId !== session.clubId) {
    return { error: "Gymnaste introuvable dans votre club." };
  }

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
  });
  if (!competition) return { error: "Compétition introuvable." };

  // Sexe du concours : un concours filles/garçons n'accepte que ce sexe
  if (competition.gender && gymnast.gender !== competition.gender) {
    return {
      error:
        competition.gender === "F"
          ? "Concours filles : ce gymnaste ne peut pas être inscrit."
          : "Concours garçons : cette gymnaste ne peut pas être inscrite.",
    };
  }

  // L'inscription se fait dans la catégorie du gymnaste, qui doit être
  // ouverte dans cette compétition
  if (!gymnast.categoryId) {
    return { error: "Ce gymnaste n'a pas de catégorie — classez-le d'abord (page Gymnastes)." };
  }
  const cc = await prisma.competitionCategory.findUnique({
    where: {
      competitionId_categoryId: { competitionId, categoryId: gymnast.categoryId },
    },
  });
  if (!cc) {
    return { error: "La catégorie de ce gymnaste n'est pas au programme de cette compétition." };
  }

  // Un gymnaste ne participe qu'une fois à une même compétition
  const existing = await prisma.registration.findUnique({
    where: { competitionId_gymnastId: { competitionId, gymnastId } },
  });
  if (existing) return { error: "Ce gymnaste est déjà inscrit à cette compétition." };

  await prisma.registration.create({
    data: {
      competitionId,
      gymnastId,
      categoryId: gymnast.categoryId,
      competitionCategoryId: cc.id,
      createdById: session.id,
    },
  });
  revalidatePath(`/moniteur/competitions/${competitionId}`);
  return { success: "Gymnaste inscrit." };
}

// ─── Soumission des liens vidéo ──────────────────────

export async function submitVideo(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("MONITEUR");
  const registrationId = String(formData.get("registrationId"));
  const competitionApparatusId = String(formData.get("competitionApparatusId"));
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const videoUrl2 = String(formData.get("videoUrl2") ?? "").trim();

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { gymnast: true },
  });
  if (!registration || registration.gymnast.clubId !== session.clubId) {
    return { error: "Inscription introuvable." };
  }

  const ca = await prisma.competitionApparatus.findUnique({
    where: { id: competitionApparatusId },
    include: { round: true, apparatus: true },
  });
  if (!ca) return { error: "Engin introuvable." };

  // Fenêtre d'upload
  const now = new Date();
  if (ca.round) {
    if (now < ca.round.uploadStart) {
      return { error: "La fenêtre d’envoi n’est pas encore ouverte pour cet engin." };
    }
    if (now > ca.round.uploadEnd) {
      return { error: "La deadline d’envoi est passée pour cet engin." };
    }
  }

  if (!videoUrl || !isValidYoutubeUrl(videoUrl)) {
    return { error: "Lien YouTube invalide." };
  }
  if (ca.apparatus.twoAttempts) {
    // Deux passages : les deux vidéos sont obligatoires (saut 1 et saut 2)
    if (!videoUrl2 || !isValidYoutubeUrl(videoUrl2)) {
      return { error: "Le lien du 2e saut est requis et doit être un lien YouTube valide." };
    }
  } else if (videoUrl2) {
    return { error: "Cet engin n’accepte qu’une seule vidéo." };
  }

  const existing = await prisma.performance.findUnique({
    where: {
      registrationId_competitionApparatusId: {
        registrationId,
        competitionApparatusId,
      },
    },
    include: { scores: true },
  });

  if (existing && existing.scores.length > 0) {
    return { error: "Cette prestation a déjà été jugée — modification impossible." };
  }

  await prisma.performance.upsert({
    where: {
      registrationId_competitionApparatusId: {
        registrationId,
        competitionApparatusId,
      },
    },
    update: { videoUrl, videoUrl2: videoUrl2 || null, submittedAt: now, status: "SUBMITTED" },
    create: {
      registrationId,
      competitionApparatusId,
      videoUrl,
      videoUrl2: videoUrl2 || null,
      submittedAt: now,
      status: "SUBMITTED",
    },
  });
  revalidatePath(`/moniteur/competitions/${registration.competitionId}`);
  return { success: "Vidéo enregistrée." };
}
