import { randomBytes } from "crypto";
import { PrismaClient, Role, PerformanceStatus, ScoreEntryMode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Mot de passe des comptes de démo : via SEED_PASSWORD (.env), sinon généré
// aléatoirement et affiché en fin de seed. Jamais en dur dans le dépôt.
const seedPassword = process.env.SEED_PASSWORD ?? randomBytes(9).toString("base64url");

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays: number) => new Date(now + offsetDays * DAY);

async function main() {
  // ── Catégories de base ──────────────────────────────
  const categoryCodes = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "CH", "CD"];
  const categories: Record<string, { id: string }> = {};
  for (let i = 0; i < categoryCodes.length; i++) {
    const code = categoryCodes[i];
    categories[code] = await prisma.category.upsert({
      where: { code },
      update: {},
      create: { code, name: `Catégorie ${code}`, order: i },
    });
  }

  // ── Engins de base ──────────────────────────────────
  const apparatusData = [
    { code: "FLOOR", name: "Sol", order: 0 },
    { code: "RINGS", name: "Anneaux", order: 1 },
    { code: "VAULT", name: "Saut", order: 2, twoAttempts: true },
    { code: "HIGH_BAR", name: "Barre fixe", order: 3 },
    { code: "PARALLEL_BARS", name: "Barres parallèles", order: 4 },
  ];
  const apparatus: Record<string, { id: string }> = {};
  for (const a of apparatusData) {
    apparatus[a.code] = await prisma.apparatus.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    });
  }

  // ── Déductions globales ─────────────────────────────
  const deductions = [
    { name: "Chute", value: "0.5" },
    { name: "Élément manquant", value: "1.0" },
    { name: "Jambes fléchies", value: "0.1", maxValue: "0.3" },
    { name: "Pieds non joints", value: "0.1" },
    { name: "Réception non stabilisée", value: "0.1", maxValue: "0.3" },
    { name: "Sortie de praticable", value: "0.1", apparatusCodes: ["FLOOR"] },
    { name: "Balancements aux anneaux", value: "0.1", maxValue: "0.3", apparatusCodes: ["RINGS"] },
    { name: "Appui intermédiaire au saut", value: "0.5", apparatusCodes: ["VAULT"] },
  ];
  const existingDeductions = await prisma.deductionType.count();
  if (existingDeductions === 0) {
    for (const dd of deductions) {
      await prisma.deductionType.create({
        data: {
          name: dd.name,
          value: dd.value,
          maxValue: dd.maxValue ?? null,
          apparatus: dd.apparatusCodes
            ? {
                create: dd.apparatusCodes.map((code) => ({
                  apparatusId: apparatus[code].id,
                })),
              }
            : undefined,
        },
      });
    }
  }

  // ── Clubs ───────────────────────────────────────────
  const clubNames = ["FSG Morges", "FSG Lausanne Ville", "FSG Yverdon Amis-Gyms"];
  const clubs = [];
  for (const name of clubNames) {
    clubs.push(
      await prisma.club.upsert({ where: { name }, update: {}, create: { name } })
    );
  }

  // ── Utilisateurs ────────────────────────────────────
  const hash = await bcrypt.hash(seedPassword, 10);
  const mkUser = (
    email: string,
    firstName: string,
    lastName: string,
    role: Role,
    clubId?: string
  ) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, firstName, lastName, role, passwordHash: hash, clubId },
    });

  const admin = await mkUser("admin@ffg.ch", "Alice", "Admin", Role.ADMIN);
  const monitor1 = await mkUser("moniteur1@ffg.ch", "Marc", "Dubois", Role.MONITEUR, clubs[0].id);
  const monitor2 = await mkUser("moniteur2@ffg.ch", "Sophie", "Martin", Role.MONITEUR, clubs[1].id);
  const monitor3 = await mkUser("moniteur3@ffg.ch", "Luc", "Favre", Role.MONITEUR, clubs[2].id);
  const judge1 = await mkUser("juge1@ffg.ch", "Jean", "Rochat", Role.JUGE);
  const judge2 = await mkUser("juge2@ffg.ch", "Nina", "Bovay", Role.JUGE);
  const judge3 = await mkUser("juge3@ffg.ch", "Paul", "Meier", Role.JUGE);

  // ── Gymnastes ───────────────────────────────────────
  const gymnastData: [string, string, number, number][] = [
    // [prénom, nom, année, index club]
    ["Léo", "Bertholet", 2014, 0],
    ["Noah", "Gilliéron", 2013, 0],
    ["Ethan", "Pittet", 2012, 0],
    ["Liam", "Rossier", 2014, 1],
    ["Nathan", "Chevalley", 2013, 1],
    ["Gabriel", "Monney", 2011, 1],
    ["Arthur", "Badan", 2014, 2],
    ["Louis", "Cornu", 2012, 2],
    ["Hugo", "Despont", 2011, 2],
    ["Théo", "Jaccoud", 2010, 0],
    ["Maxime", "Ruchat", 2010, 1],
    ["Antoine", "Vulliamy", 2009, 2],
  ];
  const catForGymnast = (birthYear: number) => {
    if (birthYear >= 2014) return "C1";
    if (birthYear >= 2013) return "C2";
    if (birthYear >= 2011) return "C3";
    return "C4";
  };

  const gymnasts = [];
  for (const [firstName, lastName, birthYear, clubIdx] of gymnastData) {
    const clubId = clubs[clubIdx].id;
    const existing = await prisma.gymnast.findFirst({
      where: { firstName, lastName, clubId },
    });
    gymnasts.push(
      existing ??
        (await prisma.gymnast.create({
          data: {
            firstName,
            lastName,
            birthYear,
            gender: "M",
            clubId,
            categoryId: categories[catForGymnast(birthYear)].id,
          },
        }))
    );
  }

  // ── Compétition active 2026 ─────────────────────────
  if (await prisma.competition.findFirst({ where: { name: "FFG Online 2026" } })) {
    console.log("Seed déjà appliqué — compétitions existantes conservées.");
    return;
  }

  const compet = await prisma.competition.create({
    data: {
      name: "FFG Online 2026",
      year: 2026,
      description:
        "Compétition de gymnastique vidéo — 5 semaines, un engin par semaine.",
      status: "ACTIVE",
      scoringMethod: "AVERAGE",
      judgesPerApparatus: 2,
      categories: {
        create: ["C1", "C2", "C3", "C4"].map((code) => ({
          categoryId: categories[code].id,
        })),
      },
    },
  });

  // 5 semaines : 5 jours upload, 2 jours jugement, publication ensuite.
  // Semaines 1-2 passées et publiées, semaine 3 en jugement, 4-5 à venir.
  const roundDefs = [
    { number: 1, uploadStart: d(-20), uploadEnd: d(-15), judgingEnd: d(-13), publicationAt: d(-13), validatedAt: d(-13) },
    { number: 2, uploadStart: d(-13), uploadEnd: d(-8), judgingEnd: d(-6), publicationAt: d(-6), validatedAt: d(-6) },
    { number: 3, uploadStart: d(-6), uploadEnd: d(-1), judgingEnd: d(1), publicationAt: d(2), validatedAt: null },
    { number: 4, uploadStart: d(1), uploadEnd: d(6), judgingEnd: d(8), publicationAt: d(9), validatedAt: null },
    { number: 5, uploadStart: d(8), uploadEnd: d(13), judgingEnd: d(15), publicationAt: d(16), validatedAt: null },
  ];
  const rounds = [];
  for (const r of roundDefs) {
    rounds.push(
      await prisma.competitionRound.create({
        data: { ...r, competitionId: compet.id },
      })
    );
  }

  // Un engin par semaine, dans l'ordre configuré
  const apparatusOrder = ["FLOOR", "RINGS", "VAULT", "HIGH_BAR", "PARALLEL_BARS"];
  const competApparatus: Record<string, { id: string }> = {};
  for (let i = 0; i < apparatusOrder.length; i++) {
    competApparatus[apparatusOrder[i]] = await prisma.competitionApparatus.create({
      data: {
        competitionId: compet.id,
        apparatusId: apparatus[apparatusOrder[i]].id,
        order: i,
        roundId: rounds[i].id,
      },
    });
  }

  // Assignation des juges : juge1+juge2 partout, juge3 sur saut et barre fixe
  const assign = async (judgeId: string, codes: string[]) => {
    for (const code of codes) {
      await prisma.judgeAssignment.create({
        data: { competitionId: compet.id, judgeId, apparatusId: apparatus[code].id },
      });
    }
  };
  await assign(judge1.id, apparatusOrder);
  await assign(judge2.id, apparatusOrder);
  await assign(judge3.id, ["VAULT", "HIGH_BAR"]);

  // ── Inscriptions ────────────────────────────────────
  const monitorByClub: Record<string, string> = {
    [clubs[0].id]: monitor1.id,
    [clubs[1].id]: monitor2.id,
    [clubs[2].id]: monitor3.id,
  };

  const registrations = [];
  for (const g of gymnasts) {
    const code = catForGymnast(g.birthYear ?? 2012);
    const cc = await prisma.competitionCategory.findUnique({
      where: {
        competitionId_categoryId: {
          competitionId: compet.id,
          categoryId: categories[code].id,
        },
      },
    });
    registrations.push(
      await prisma.registration.create({
        data: {
          competitionId: compet.id,
          gymnastId: g.id,
          categoryId: categories[code].id,
          competitionCategoryId: cc?.id,
          createdById: monitorByClub[g.clubId],
        },
      })
    );
  }

  // ── Prestations + scores ────────────────────────────
  // Vidéos YouTube de démo (liens factices non répertoriés)
  const demoVideos = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "https://www.youtube.com/watch?v=9bZkp7q19f0",
  ];

  // Générateur pseudo-aléatoire déterministe
  let seedVal = 42;
  const rand = () => {
    seedVal = (seedVal * 1103515245 + 12345) % 2147483648;
    return seedVal / 2147483648;
  };

  const judgesFor = (code: string) =>
    code === "VAULT" || code === "HIGH_BAR"
      ? [judge1, judge2, judge3]
      : [judge1, judge2];

  for (let i = 0; i < registrations.length; i++) {
    const reg = registrations[i];

    // Semaines 1 et 2 : soumis + jugé. Semaine 3 : soumis (sauf 2 gymnastes), en jugement.
    for (let w = 0; w < 3; w++) {
      const code = apparatusOrder[w];
      const ca = competApparatus[code];
      const missedWeek3 = w === 2 && i % 6 === 5; // quelques vidéos manquantes

      if (missedWeek3) {
        await prisma.performance.create({
          data: {
            registrationId: reg.id,
            competitionApparatusId: ca.id,
            status: PerformanceStatus.MISSING,
          },
        });
        continue;
      }

      // Engin à deux passages (saut) : deux vidéos obligatoires
      const twoAttempts = code === "VAULT";
      const perf = await prisma.performance.create({
        data: {
          registrationId: reg.id,
          competitionApparatusId: ca.id,
          videoUrl: demoVideos[i % demoVideos.length],
          videoUrl2: twoAttempts ? demoVideos[(i + 1) % demoVideos.length] : null,
          submittedAt: roundDefs[w].uploadStart,
          status: w < 2 ? PerformanceStatus.JUDGED : i % 3 === 0 ? PerformanceStatus.JUDGING : PerformanceStatus.SUBMITTED,
        },
      });

      // Scores : semaines 1-2 complètes ; semaine 3 partielle (juge1 seulement, 1/3 des cas)
      const judges = judgesFor(code);
      const scoringJudges = w < 2 ? judges : i % 3 === 0 ? [judge1] : [];
      const attempts = twoAttempts ? [1, 2] : [1];

      for (const judge of scoringJudges) {
        for (const attempt of attempts) {
          const nDeductions = 1 + Math.floor(rand() * 4);
          const deductionValues: number[] = [];
          for (let k = 0; k < nDeductions; k++) {
            deductionValues.push(Math.round((0.1 + rand() * 0.4) * 10) / 10);
          }
          const total = deductionValues.reduce((s, v) => s + v, 0);
          const value = Math.max(0, Math.round((10 - total) * 10) / 10);

          await prisma.score.create({
            data: {
              performanceId: perf.id,
              judgeId: judge.id,
              attempt,
              value: value.toFixed(2),
              entryMode: ScoreEntryMode.DEDUCTIONS,
              comment: rand() > 0.7 ? "Belle amplitude, réception à travailler." : null,
              deductions: {
                create: deductionValues.map((v, idx) => ({
                  value: v.toFixed(1),
                  order: idx,
                })),
              },
            },
          });
        }
      }
    }
  }

  // Publications (audit) pour les semaines validées
  for (const r of rounds.slice(0, 2)) {
    await prisma.resultPublication.create({
      data: { competitionId: compet.id, roundId: r.id, validatedById: admin.id },
    });
  }

  // ── Compétition archivée 2025 (consultation historique) ──
  const oldCompet = await prisma.competition.create({
    data: {
      name: "FFG Online 2025",
      year: 2025,
      description: "Édition 2025 — archivée.",
      status: "ARCHIVED",
      scoringMethod: "AVERAGE",
      judgesPerApparatus: 1,
      categories: { create: [{ categoryId: categories["C1"].id }, { categoryId: categories["C2"].id }] },
    },
  });
  const oldRound = await prisma.competitionRound.create({
    data: {
      competitionId: oldCompet.id,
      number: 1,
      uploadStart: new Date("2025-03-01"),
      uploadEnd: new Date("2025-03-06"),
      judgingEnd: new Date("2025-03-08"),
      publicationAt: new Date("2025-03-09T18:00:00"),
      validatedAt: new Date("2025-03-09T17:00:00"),
    },
  });
  const oldCa = await prisma.competitionApparatus.create({
    data: {
      competitionId: oldCompet.id,
      apparatusId: apparatus["FLOOR"].id,
      order: 0,
      roundId: oldRound.id,
    },
  });
  for (let i = 0; i < 4; i++) {
    const g = gymnasts[i];
    const code = i < 2 ? "C1" : "C2";
    const reg = await prisma.registration.create({
      data: {
        competitionId: oldCompet.id,
        gymnastId: g.id,
        categoryId: categories[code].id,
        createdById: monitorByClub[g.clubId],
      },
    });
    const perf = await prisma.performance.create({
      data: {
        registrationId: reg.id,
        competitionApparatusId: oldCa.id,
        videoUrl: demoVideos[i % demoVideos.length],
        submittedAt: new Date("2025-03-04"),
        status: PerformanceStatus.JUDGED,
      },
    });
    await prisma.score.create({
      data: {
        performanceId: perf.id,
        judgeId: judge1.id,
        value: (8 + rand() * 1.5).toFixed(2),
        entryMode: ScoreEntryMode.DIRECT,
      },
    });
  }

  console.log("Seed terminé.");
  console.log(`Comptes de démo (mot de passe : ${seedPassword}) :`);
  console.log("  admin@ffg.ch (Admin)");
  console.log("  moniteur1@ffg.ch, moniteur2@ffg.ch, moniteur3@ffg.ch (Moniteurs)");
  console.log("  juge1@ffg.ch, juge2@ffg.ch, juge3@ffg.ch (Juges)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
