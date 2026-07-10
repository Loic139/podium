# Podium — Compétitions de gymnastique vidéo

MVP d'une plateforme pour organiser des compétitions de gymnastique en ligne :
les moniteurs soumettent des liens YouTube, les juges notent à distance, les
classements sont publiés semaine après semaine.

## Stack

- **Next.js 16** (App Router, Server Actions) + **TypeScript**
- **MySQL** + **Prisma 6**
- **Tailwind CSS 4**
- Authentification maison : sessions JWT (cookie httpOnly, `jose`) + `bcryptjs`,
  comptes créés par **invitation** (lien avec token, validité 7 jours)

## Démarrage

```bash
npm install
# Configurer .env : DATABASE_URL, AUTH_SECRET, APP_URL
npx prisma migrate dev   # crée le schéma
npx prisma db seed       # données de démonstration
npm run dev
```

### Comptes de démonstration

Le mot de passe commun est défini par la variable `SEED_PASSWORD` (fichier
`.env`) ; sans elle, le seed en génère un aléatoire et l'affiche en console.

| Email | Rôle |
|---|---|
| `admin@ffg.ch` | Admin |
| `moniteur1@ffg.ch` … `moniteur3@ffg.ch` | Moniteur (un club chacun) |
| `juge1@ffg.ch` … `juge3@ffg.ch` | Juge |

Le seed crée une compétition **FFG Online 2026** (5 semaines, un engin par
semaine, dates relatives à aujourd'hui : semaines 1-2 publiées, semaine 3 en
jugement) et une compétition archivée 2025.

## Architecture

```
prisma/
  schema.prisma        # modèle de données complet
  seed.ts              # catégories C1-C7/CH/CD, engins, déductions, démo
src/
  lib/
    prisma.ts          # client Prisma singleton
    auth.ts            # sessions JWT, requireRole(), invitations
    scoring.ts         # calcul des notes, classements, règle de publication
    youtube.ts         # parsing liens, miniatures, embed
    format.ts          # formatage fr-CH (dates, notes)
    actions/           # Server Actions par rôle
      auth.ts          # login, logout, acceptation d'invitation
      admin.ts         # CRUD référentiels, compétitions, juges, validation
      moniteur.ts      # gymnastes, inscriptions, soumission vidéos
      juge.ts          # enregistrement des notes + déductions
  app/
    page.tsx                     # accueil public
    competitions/                # liste + résultats publics
    login/ · invitation/[token]/ # authentification
    admin/                       # dashboard admin complet
    moniteur/                    # dashboard moniteur
    juge/                        # liste + interface de notation
  components/          # AppShell, PublicShell, StatusBadge
```

## Règles métier implémentées

- **Publication** : les résultats d'une semaine ne sont publics que si l'admin
  les a **validés** ET que l'**heure de publication est passée**.
- **Note** : départ à 10, déductions en dixièmes (pas de 0.05). Un seul juge →
  sa note ; plusieurs → moyenne (ou moyenne sans min/max, configurable par
  compétition). Moyennes à 2 décimales.
- **Vidéo manquante** après la deadline d'envoi → note 0 (forfait sur l'engin).
- **Saut (engin à deux passages)** : deux vidéos obligatoires (saut 1 et
  saut 2), le juge donne une note par saut, la note finale de l'engin est la
  moyenne des deux sauts (chaque saut étant d'abord combiné entre juges selon
  la méthode de la compétition).
- **Un gymnaste = une seule participation** par compétition (contrainte DB).
- Le **juge** ne voit que les prestations de ses engins assignés, peut corriger
  sa note tant que la semaine n'est pas validée. Raccourcis clavier :
  `1`/`2`/`3` = −0.1/−0.2/−0.3, `0` = annuler la dernière déduction.
  Commentaire interne jamais affiché publiquement.
- **Déductions** globales gérées par l'admin (nom, valeur ou fourchette,
  engins applicables, actif/inactif).

## Prévu pour la suite (architecture prête)

- Import/synchronisation d'une base existante (`externalId` sur Club/Gymnast)
- Résultats par équipe (les gymnastes sont rattachés à un club)
- Upload vidéo direct (remplacer `videoUrl` par un stockage)
- Multilingue FR/DE/EN, export PDF, diplômes, statistiques par club
