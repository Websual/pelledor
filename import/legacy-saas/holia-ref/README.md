# holia-ref — extrait Holia pour SaaS-OS

Copie statique depuis le projet **holia.me** (sans modifier le repo source).

## Arborescence

```
holia-ref/
├── app/                 # Next.js App Router complet (UI + app/api/*)
├── lib/                 # Prisma, auth, emails, crypto, stripe helpers, etc.
├── components/          # Composants React (shadcn + métier)
├── prisma/
│   └── schema.prisma    # Modèles PostgreSQL
├── hooks/               # Hooks React (si présents)
├── types/               # Types TS (si présents)
├── middleware.ts        # NextAuth / routes protégées
├── package.json         # Dépendances de référence
├── tsconfig.json
├── next.config.*        # Config Next
├── tailwind.config.*
├── postcss.config.*
├── components.json      # shadcn
└── env.example.txt      # Variables (exemple, sans secrets)
```

## Ce qui n’est pas copié

- `node_modules`, `.next`
- `public/` (images, favicon, etc.)
- Fichiers `.env` (secrets)
- Scripts hors `app/lib/components` (ex. `holia-auto-enricher/`, scripts racine)
- Tests `*.test.ts`

## Utilisation

1. Ouvrir un fichier dans `app/api/...` ou `app/pro/...` comme modèle.
2. Copier vers ton SaaS-OS en adaptant imports et schéma Prisma.
3. Aligner `env.example.txt` avec les clés réellement utilisées dans les fichiers copiés.

## Taille indicative

~400+ fichiers, ~5–6 Mo (sans binaires).
