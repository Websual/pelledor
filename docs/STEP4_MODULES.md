# Etape 4 — CLI et modules

## Commande

```bash
pnpm saas:build
```

1. Lit `saas-modules.json` (`modules: ["notes", "stripe", ...]`).
2. Fusionne les `dependencies` de chaque `content/modules/<name>/module.json` dans `package.json`.
3. Copie `content/modules/<name>/routes/` -> `src/app/(modules)/<name>/`.
4. Copie `content/modules/<name>/api/` -> `src/app/api/modules/<name>/`.

Puis : `pnpm install` et appliquer les migrations SQL (dont `drizzle/0002_modules_notes_stripe.sql`).

## Modules livres

| Module | Routes | API | Drizzle |
|--------|--------|-----|---------|
| **notes** | `/notes`, `/notes/new`, `/notes/billing` | — | `notes`, `note_access` |
| **stripe** | — | `/api/modules/stripe/webhook`, `checkout` | `stripe_customers` |

## Variables d environnement Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (endpoint pointant vers `/api/modules/stripe/webhook`)
- Optionnel : `STRIPE_NOTE_PRICE_ID` (Price Stripe) sinon `STRIPE_NOTE_PRICE_CENTS` (ex. `500`)

## Flux demo

1. Install / login.
2. `user_created` cree le client Stripe (si cle presente).
3. `/notes/billing` -> Checkout -> webhook -> `note_access` -> creation de notes.

## Legacy

Voir `import/legacy-saas/README.md` pour la cartographie Prisma -> modules.
