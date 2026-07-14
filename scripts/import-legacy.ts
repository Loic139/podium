/**
 * Migration des données historiques (exports CSV de l'ancienne application).
 *
 * Usage :
 *   npx tsx scripts/import-legacy.ts <gymnastes.csv> <contacts.csv> [--dry-run]
 *
 * - Clubs : créés depuis les id_soc rencontrés (nom provisoire "Société N",
 *   renommable dans l'admin), rattachés via externalId pour permettre une
 *   resynchronisation future sans doublons.
 * - Gymnastes : upsert par externalId (id_gymnaste), nom/prénom séparés,
 *   année de naissance validée (sinon null).
 * - Contacts : dédoublonnés par email → comptes MONITEUR sans mot de passe
 *   (aucun accès tant qu'une invitation n'est pas envoyée depuis l'admin).
 *
 * Les inscriptions aux anciens concours (AG, AF, …) ne sont pas migrées :
 * les catégories et le format ne correspondent pas à la nouvelle plateforme.
 * Relançable sans risque : les enregistrements existants ne sont pas modifiés.
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Parsing CSV (séparateur ;, champs entre guillemets, encodage latin1) ──

function parseCsv(path: string): Record<string, string>[] {
  const content = readFileSync(path, "latin1");
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (c === '"') {
          inQuotes = false;
        } else {
          current += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ";") {
        fields.push(current);
        current = "";
      } else {
        current += c;
      }
    }
    fields.push(current);
    return fields;
  };

  const header = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = (values[i] ?? "").trim()));
    return row;
  });
}

// ── Normalisation ─────────────────────────────────────

/** "Oberson Lucas" → { lastName: "Oberson", firstName: "Lucas" } ;
 *  "Da Silva Luis" → { lastName: "Da Silva", firstName: "Luis" } */
function splitName(full: string): { firstName: string; lastName: string } {
  const clean = full.replace(/\s+/g, " ").trim();
  const idx = clean.lastIndexOf(" ");
  if (idx === -1) return { firstName: "", lastName: clean };
  return { lastName: clean.slice(0, idx), firstName: clean.slice(idx + 1) };
}

function parseBirthYear(raw: string): number | null {
  const y = parseInt(raw, 10);
  const currentYear = new Date().getFullYear();
  return Number.isInteger(y) && y >= 1900 && y <= currentYear ? y : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Import ────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const [gymnastsPath, contactsPath] = args.filter((a) => !a.startsWith("--"));
  if (!gymnastsPath || !contactsPath) {
    console.error("Usage: npx tsx scripts/import-legacy.ts <gymnastes.csv> <contacts.csv> [--dry-run]");
    process.exit(1);
  }

  const gymnastRows = parseCsv(gymnastsPath);
  const contactRows = parseCsv(contactsPath);

  const stats = {
    clubs: 0,
    gymnasts: 0,
    gymnastsSkipped: 0,
    birthYearInvalid: 0,
    moniteurs: 0,
    moniteursSkipped: 0,
    existing: 0,
  };

  // 1. Clubs — union des sociétés des deux fichiers
  const socIds = new Set<string>();
  for (const r of gymnastRows) if (r["id_soc"]) socIds.add(r["id_soc"]);
  for (const r of contactRows) if (r["id_soc"]) socIds.add(r["id_soc"]);

  const clubIdByExternal = new Map<string, string>();
  for (const socId of socIds) {
    if (dryRun) {
      clubIdByExternal.set(socId, `dry-${socId}`);
      stats.clubs++;
      continue;
    }
    const club = await prisma.club.upsert({
      where: { externalId: socId },
      update: {}, // ne pas écraser un nom déjà personnalisé dans l'admin
      create: { externalId: socId, name: `Société ${socId}` },
    });
    clubIdByExternal.set(socId, club.id);
    stats.clubs++;
  }

  // 2. Gymnastes — upsert par externalId
  const seenGymnasts = new Set<string>();
  for (const r of gymnastRows) {
    const externalId = r["id_gymnaste"];
    const clubId = clubIdByExternal.get(r["id_soc"]);
    const { firstName, lastName } = splitName(r["Nom_prenom_gymnaste"] ?? "");
    if (!externalId || !clubId || !lastName || seenGymnasts.has(externalId)) {
      stats.gymnastsSkipped++;
      continue;
    }
    seenGymnasts.add(externalId);
    const birthYear = parseBirthYear(r["annee_nais"]);
    if (birthYear === null) stats.birthYearInvalid++;

    if (!dryRun) {
      const existing = await prisma.gymnast.findUnique({ where: { externalId } });
      if (existing) {
        stats.existing++;
        continue;
      }
      await prisma.gymnast.create({
        data: { externalId, firstName, lastName, birthYear, clubId },
      });
    }
    stats.gymnasts++;
  }

  // 3. Contacts → moniteurs (dédoublonnés par email, sans mot de passe :
  //    aucun accès tant que l'admin n'envoie pas d'invitation)
  const seenEmails = new Set<string>();
  for (const r of contactRows) {
    const email = (r["email_contact"] ?? "").toLowerCase().trim();
    const clubId = clubIdByExternal.get(r["id_soc"]);
    const firstName = (r["prenom_contact"] ?? "").trim();
    const lastName = (r["nom_contact"] ?? "").trim();
    if (!EMAIL_RE.test(email) || !clubId || !lastName || seenEmails.has(email)) {
      stats.moniteursSkipped++;
      continue;
    }
    seenEmails.add(email);

    if (!dryRun) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        stats.existing++;
        continue;
      }
      await prisma.user.create({
        data: {
          email,
          firstName: firstName || "–",
          lastName,
          role: "MONITEUR",
          clubId,
        },
      });
    }
    stats.moniteurs++;
  }

  console.log(dryRun ? "── Simulation (aucune écriture) ──" : "── Import terminé ──");
  console.log(`Clubs                 : ${stats.clubs}`);
  console.log(`Gymnastes importés    : ${stats.gymnasts} (ignorés : ${stats.gymnastsSkipped}, année de naissance invalide → null : ${stats.birthYearInvalid})`);
  console.log(`Moniteurs importés    : ${stats.moniteurs} (lignes ignorées/doublons : ${stats.moniteursSkipped})`);
  if (stats.existing > 0) {
    console.log(`Déjà présents (non modifiés) : ${stats.existing}`);
  }
  console.log("\nRappels :");
  console.log("· Les clubs s'appellent « Société N » — renommez-les dans l'admin (Clubs).");
  console.log("· Les moniteurs importés n'ont PAS de mot de passe : envoyez-leur une");
  console.log("  invitation depuis l'admin (Utilisateurs) quand vous voudrez les activer.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
