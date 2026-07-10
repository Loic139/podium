"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export type ScoreState = {
  error?: string;
  success?: string;
  /** Passage restant à noter sur la même prestation (saut) */
  nextAttempt?: number;
  /** Prochaine prestation à juger ; null = plus rien à juger */
  nextPerformanceId?: string | null;
};

export type DeductionInput = {
  deductionTypeId: string | null;
  value: number;
};

/**
 * Enregistre (ou remplace) la note d'un juge pour une prestation.
 * Autorisé tant que la semaine n'est pas validée/publiée.
 */
export async function saveScore(
  _prev: ScoreState,
  formData: FormData
): Promise<ScoreState> {
  const session = await requireRole("JUGE");
  const performanceId = String(formData.get("performanceId"));
  const attempt = String(formData.get("attempt")) === "2" ? 2 : 1;
  const entryMode = String(formData.get("entryMode")) === "DIRECT" ? "DIRECT" : "DEDUCTIONS";
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const performance = await prisma.performance.findUnique({
    where: { id: performanceId },
    include: {
      competitionApparatus: { include: { round: true, apparatus: true } },
      registration: true,
    },
  });
  if (!performance) return { error: "Prestation introuvable." };
  if (!performance.videoUrl) return { error: "Aucune vidéo soumise pour cette prestation." };
  if (attempt === 2 && !performance.competitionApparatus.apparatus.twoAttempts) {
    return { error: "Cet engin n’a qu’un seul passage." };
  }

  // Le juge doit être assigné à cet engin pour cette compétition
  const assignment = await prisma.judgeAssignment.findUnique({
    where: {
      competitionId_judgeId_apparatusId: {
        competitionId: performance.registration.competitionId,
        judgeId: session.id,
        apparatusId: performance.competitionApparatus.apparatusId,
      },
    },
  });
  if (!assignment) return { error: "Vous n’êtes pas assigné à cet engin." };

  // Verrouillé une fois les résultats validés
  const round = performance.competitionApparatus.round;
  if (round?.validatedAt) {
    return { error: "Résultats validés — la note ne peut plus être modifiée." };
  }

  // Calcul de la valeur
  let value: number;
  let deductions: DeductionInput[] = [];

  if (entryMode === "DIRECT") {
    value = parseFloat(String(formData.get("value")));
    if (isNaN(value) || value < 0 || value > 10) {
      return { error: "Note invalide (0 à 10)." };
    }
    // Précision au dixième minimum — pas de 0.05
    value = Math.round(value * 10) / 10;
  } else {
    try {
      deductions = JSON.parse(String(formData.get("deductions") ?? "[]"));
    } catch {
      return { error: "Déductions invalides." };
    }
    for (const d of deductions) {
      const v = Math.round(d.value * 10) / 10;
      if (v <= 0 || v !== d.value) {
        return { error: "Chaque déduction doit être un multiple positif de 0.1." };
      }
    }
    const total = deductions.reduce((s, d) => s + d.value, 0);
    value = Math.max(0, Math.round((10 - total) * 10) / 10);
  }

  await prisma.$transaction(async (tx) => {
    // Remplace la note existante de ce juge pour ce passage (correction autorisée)
    const existing = await tx.score.findUnique({
      where: {
        performanceId_judgeId_attempt: { performanceId, judgeId: session.id, attempt },
      },
    });
    if (existing) {
      await tx.scoreDeduction.deleteMany({ where: { scoreId: existing.id } });
      await tx.score.delete({ where: { id: existing.id } });
    }

    await tx.score.create({
      data: {
        performanceId,
        judgeId: session.id,
        attempt,
        value: value.toFixed(2),
        entryMode,
        comment,
        deductions: {
          create: deductions.map((d, i) => ({
            deductionTypeId: d.deductionTypeId,
            value: d.value.toFixed(1),
            order: i,
          })),
        },
      },
    });

    // Met à jour le statut de la prestation : jugée quand chaque juge assigné
    // a noté chaque passage attendu
    const expectedJudges = await tx.judgeAssignment.count({
      where: {
        competitionId: performance.registration.competitionId,
        apparatusId: performance.competitionApparatus.apparatusId,
      },
    });
    const attemptsCount = performance.competitionApparatus.apparatus.twoAttempts ? 2 : 1;
    const scoreCount = await tx.score.count({ where: { performanceId } });
    await tx.performance.update({
      where: { id: performanceId },
      data: {
        status: scoreCount >= expectedJudges * attemptsCount ? "JUDGED" : "JUDGING",
      },
    });
  });

  revalidatePath("/juge");
  revalidatePath(`/juge/prestations/${performanceId}`);

  const success = `Note enregistrée : ${value.toFixed(2)}`;

  // Enchaînement : passage restant du même gymnaste, sinon prestation suivante
  const attemptsCount = performance.competitionApparatus.apparatus.twoAttempts ? 2 : 1;
  if (attemptsCount === 2) {
    const myScores = await prisma.score.findMany({
      where: { performanceId, judgeId: session.id },
      select: { attempt: true },
    });
    const missing = [1, 2].find((a) => !myScores.some((s) => s.attempt === a));
    if (missing) return { success, nextAttempt: missing };
  }

  const assignments = await prisma.judgeAssignment.findMany({
    where: { judgeId: session.id },
  });
  const candidates = await prisma.performance.findMany({
    where: {
      id: { not: performanceId },
      videoUrl: { not: null },
      OR: assignments.map((a) => ({
        registration: { competitionId: a.competitionId },
        competitionApparatus: { apparatusId: a.apparatusId },
      })),
      competitionApparatus: { round: { validatedAt: null } },
    },
    include: {
      scores: { where: { judgeId: session.id } },
      competitionApparatus: { include: { apparatus: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
  const next = candidates.find(
    (p) => p.scores.length < (p.competitionApparatus.apparatus.twoAttempts ? 2 : 1)
  );
  return { success, nextPerformanceId: next?.id ?? null };
}
