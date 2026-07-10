import { prisma } from "@/lib/prisma";
import type { ScoringMethod } from "@prisma/client";

// ─────────────────────────────────────────────────────────
// Règles de notation
// ─────────────────────────────────────────────────────────

/** Arrondi à 2 décimales (les moyennes peuvent donner p. ex. 8.25). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Note finale d'une prestation à partir des notes des juges.
 * - 1 juge : sa note.
 * - AVERAGE : moyenne.
 * - TRIMMED_AVERAGE : on retire la meilleure et la moins bonne, puis moyenne
 *   (nécessite au moins 3 notes, sinon moyenne simple).
 */
export function combineScores(values: number[], method: ScoringMethod): number | null {
  if (values.length === 0) return null;
  if (values.length === 1) return round2(values[0]);

  let pool = values;
  if (method === "TRIMMED_AVERAGE" && values.length >= 3) {
    const sorted = [...values].sort((a, b) => a - b);
    pool = sorted.slice(1, -1);
  }
  return round2(pool.reduce((s, v) => s + v, 0) / pool.length);
}

/**
 * Note finale d'une prestation, en tenant compte des passages.
 * Engin classique : les notes des juges (passage 1) combinées.
 * Engin à deux passages (saut) : chaque passage est combiné séparément,
 * la note finale est la moyenne des passages notés.
 */
export function performanceScore(
  scores: { value: number; attempt: number }[],
  method: ScoringMethod,
  twoAttempts: boolean
): number | null {
  if (!twoAttempts) {
    return combineScores(scores.map((s) => s.value), method);
  }
  const attemptScores = [1, 2]
    .map((attempt) =>
      combineScores(
        scores.filter((s) => s.attempt === attempt).map((s) => s.value),
        method
      )
    )
    .filter((v): v is number => v !== null);
  if (attemptScores.length === 0) return null;
  return round2(attemptScores.reduce((s, v) => s + v, 0) / attemptScores.length);
}

/** Un tour est publié publiquement si validé ET heure de publication passée. */
export function isRoundPublished(round: { validatedAt: Date | null; publicationAt: Date }): boolean {
  return round.validatedAt !== null && round.publicationAt.getTime() <= Date.now();
}

// ─────────────────────────────────────────────────────────
// Calcul des résultats d'une compétition
// ─────────────────────────────────────────────────────────

export type ApparatusResult = {
  competitionApparatusId: string;
  apparatusCode: string;
  apparatusName: string;
  /** null = pas encore de note (en attente) */
  score: number | null;
  /** true si 0 pour vidéo manquante après deadline */
  forfeit: boolean;
  published: boolean;
};

export type GymnastResult = {
  registrationId: string;
  gymnastId: string;
  firstName: string;
  lastName: string;
  clubName: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  apparatus: ApparatusResult[];
  /** Somme des notes des engins déjà notés/publiés */
  total: number;
  /** Rang dans sa catégorie (classement général de la catégorie) */
  rank: number;
};

export type CompetitionResults = {
  competitionId: string;
  scoringMethod: ScoringMethod;
  /** Engins de la compétition dans l'ordre configuré */
  apparatusList: {
    competitionApparatusId: string;
    code: string;
    name: string;
    order: number;
    roundNumber: number | null;
    published: boolean;
  }[];
  /** Résultats classés, groupés par catégorie */
  byCategory: Map<string, { categoryCode: string; categoryName: string; results: GymnastResult[] }>;
  /** Classement toutes catégories confondues (rangs recalculés) */
  general: GymnastResult[];
};

/**
 * Calcule tous les résultats d'une compétition.
 * publicOnly = true : ne prend en compte que les engins dont le tour est
 * validé ET dont l'heure de publication est passée (règle de publication).
 */
export async function computeCompetitionResults(
  competitionId: string,
  opts: { publicOnly: boolean }
): Promise<CompetitionResults | null> {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      apparatus: {
        include: { apparatus: true, round: true },
        orderBy: { order: "asc" },
      },
      registrations: {
        include: {
          gymnast: { include: { club: true } },
          category: true,
          performances: { include: { scores: true } },
        },
      },
    },
  });
  if (!competition) return null;

  const now = Date.now();

  const apparatusList = competition.apparatus.map((ca) => ({
    competitionApparatusId: ca.id,
    code: ca.apparatus.code,
    name: ca.apparatus.name,
    order: ca.order,
    roundNumber: ca.round?.number ?? null,
    published: ca.round ? isRoundPublished(ca.round) : false,
  }));

  const visibleApparatus = opts.publicOnly
    ? apparatusList.filter((a) => a.published)
    : apparatusList;

  const results: Omit<GymnastResult, "rank">[] = competition.registrations.map((reg) => {
    const apparatus: ApparatusResult[] = competition.apparatus.map((ca) => {
      const perf = reg.performances.find((p) => p.competitionApparatusId === ca.id);
      const published = ca.round ? isRoundPublished(ca.round) : false;
      const deadlinePassed = ca.round ? ca.round.uploadEnd.getTime() < now : false;

      let score = performanceScore(
        (perf?.scores ?? []).map((s) => ({ value: Number(s.value), attempt: s.attempt })),
        competition.scoringMethod,
        ca.apparatus.twoAttempts
      );
      let forfeit = false;

      // Pas de vidéo soumise avant la deadline → note 0
      if ((!perf || !perf.videoUrl) && deadlinePassed) {
        score = 0;
        forfeit = true;
      }

      return {
        competitionApparatusId: ca.id,
        apparatusCode: ca.apparatus.code,
        apparatusName: ca.apparatus.name,
        score,
        forfeit,
        published,
      };
    });

    const counted = opts.publicOnly ? apparatus.filter((a) => a.published) : apparatus;
    const total = round2(
      counted.reduce((s, a) => s + (a.score ?? 0), 0)
    );

    return {
      registrationId: reg.id,
      gymnastId: reg.gymnastId,
      firstName: reg.gymnast.firstName,
      lastName: reg.gymnast.lastName,
      clubName: reg.gymnast.club.name,
      categoryId: reg.categoryId,
      categoryCode: reg.category.code,
      categoryName: reg.category.name,
      apparatus: opts.publicOnly ? apparatus.filter((a) => a.published) : apparatus,
      total,
    };
  });

  // Classement : total décroissant, rangs ex æquo identiques (1, 2, 2, 4)
  const rank = (list: Omit<GymnastResult, "rank">[]): GymnastResult[] => {
    const sorted = [...list].sort((a, b) => b.total - a.total);
    let lastTotal: number | null = null;
    let lastRank = 0;
    return sorted.map((r, i) => {
      const rk = r.total === lastTotal ? lastRank : i + 1;
      lastTotal = r.total;
      lastRank = rk;
      return { ...r, rank: rk };
    });
  };

  const byCategory = new Map<string, { categoryCode: string; categoryName: string; results: GymnastResult[] }>();
  for (const r of results) {
    if (!byCategory.has(r.categoryId)) {
      byCategory.set(r.categoryId, { categoryCode: r.categoryCode, categoryName: r.categoryName, results: [] });
    }
  }
  for (const [catId, entry] of byCategory) {
    entry.results = rank(results.filter((r) => r.categoryId === catId));
  }

  return {
    competitionId,
    scoringMethod: competition.scoringMethod,
    apparatusList: visibleApparatus,
    byCategory,
    general: rank(results),
  };
}

/**
 * Classement par engin : trie les gymnastes sur la note d'un engin donné.
 */
export function rankingForApparatus(
  results: CompetitionResults,
  competitionApparatusId: string
): { result: GymnastResult; score: number }[] {
  const rows = results.general
    .map((r) => ({
      result: r,
      score: r.apparatus.find((a) => a.competitionApparatusId === competitionApparatusId)?.score ?? null,
    }))
    .filter((r): r is { result: GymnastResult; score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score);
  return rows;
}
