# Ajouter un nouveau module — Guide pas-à-pas

Un module SaaS OS est une brique fonctionnelle autonome (ex: `booking`, `billing`, `shop`) copiée dans l'app lors du `pnpm saas:build`.

---

## Structure d'un module

```
content/modules/<nom-module>/
├── module.json          # Métadonnées + dépendances NPM
├── routes/              # Pages Next.js → src/app/(modules)/<nom>/
│   ├── page.tsx
│   └── [slug]/page.tsx  # (si besoin de routes dynamiques)
└── api/                 # Routes API → src/app/api/modules/<nom>/
    └── route.ts
```

---

## Étape 1 — Créer le répertoire

```bash
mkdir -p content/modules/<nom>/{routes,api}
```

---

## Étape 2 — Écrire `module.json`

```json
{
  "name": "<nom>",
  "version": "1.0.0",
  "dependencies": {
    "some-npm-package": "^1.0.0"
  }
}
```

- `dependencies` : packages NPM additionnels (laisser `{}` si aucun)
- `name` doit correspondre exactement au nom du dossier

---

## Étape 3 — Créer les routes

**`content/modules/<nom>/routes/page.tsx`** — page principale :

```tsx
export default function MonModulePage() {
  return <div>Mon module</div>;
}
```

Routes dynamiques → sous-dossiers habituels Next.js :
- `routes/[id]/page.tsx` → `/mon-module/[id]`
- `routes/new/page.tsx` → `/mon-module/new`

**Protection auth** : importer `auth` depuis `@/auth` et rediriger si besoin.

---

## Étape 4 — Créer les API (optionnel)

**`content/modules/<nom>/api/route.ts`** :

```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true });
}
```

Accessible après build sous `/api/modules/<nom>`.

---

## Étape 5 — Schéma DB (si besoin)

1. Ajouter les tables dans `src/core/db/schema.modules.ts` :

```ts
export const monModuleItems = pgTable("mon_module_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

2. Générer la migration :

```bash
npx drizzle-kit generate
```

3. Appliquer :

```bash
npx drizzle-kit migrate
```

---

## Étape 6 — Brancher dans un blueprint

Ouvrir `content/blueprints/<metier>/saas-modules.json` et ajouter le nom du module dans la liste :

```json
{
  "modules": ["directory", "booking", "billing", "mon-module"]
}
```

---

## Étape 7 — Brancher dans le menu admin (optionnel)

Ouvrir `src/core/blueprint/admin-menu.ts` et ajouter l'entrée dans `FULL_MENU` + dans les `*_ORDER_URLS` des blueprints concernés :

```ts
{ title: "Mon module", url: "/mon-module" },
```

---

## Étape 8 — Hooker des événements (optionnel)

Si le module doit réagir à des événements du core, s'enregistrer dans `src/core/bootstrap-server.ts` :

```ts
import { registerMonModuleHooks } from "@/modules/mon-module/register";
// dans bootstrapServer() :
registerMonModuleHooks();
```

Créer `src/modules/mon-module/register.ts` :

```ts
import { Hooks } from "@/core/events/hooks";

export function registerMonModuleHooks() {
  Hooks.addAction<{ userId: string }>("user_created", async ({ userId }) => {
    // ex: initialiser des données pour ce user
  });
}
```

Hooks disponibles : `user_created`, `appointment_created`, `appointment_status_changed`, `ticket_purchased` — voir `docs/HOOKS.md`.

---

## Étape 9 — Build & test

```bash
pnpm saas:build   # fusionne modules + dépendances
pnpm install      # installe les nouvelles deps
pnpm build        # build Next.js
```

En dev :

```bash
pnpm dev
```

---

## Checklist récapitulative

- [ ] `content/modules/<nom>/module.json` créé
- [ ] Routes dans `content/modules/<nom>/routes/`
- [ ] API dans `content/modules/<nom>/api/` (si besoin)
- [ ] Schéma DB ajouté + migration générée (si besoin)
- [ ] Module ajouté dans `saas-modules.json` du blueprint cible
- [ ] Entrée menu ajoutée dans `admin-menu.ts` (si page admin)
- [ ] Hooks enregistrés dans `bootstrap-server.ts` (si besoin)
- [ ] `pnpm saas:build && pnpm build` réussi

---

## Modules existants (référence)

| Module | Description | Blueprints |
|--------|-------------|------------|
| `notes` | Notes payantes (Stripe) | transversal |
| `stripe` | Paiement en ligne | transversal |
| `booking` | RDV / agenda | artisan, praticien, cabinet, salon |
| `billing` | Factures & devis | artisan, praticien, cabinet |
| `directory` | Profil praticien public | artisan, praticien, cabinet, immobilier |
| `artisan-quotes` | Formulaire devis artisan | artisan |
| `restaurant` | Réservations tables | restaurant |
| `lodging` | Chambres / nuits | gite, hotel |
| `shop` | Boutique e-commerce | boutique |
| `events` | Événements & billets | immobilier, events |
| `blog` | Articles | transversal |
| `chat` | Chat | transversal |
| `notifications` | Notifications | transversal |
| `gift-cards` | Cartes cadeaux | boutique, restaurant |
