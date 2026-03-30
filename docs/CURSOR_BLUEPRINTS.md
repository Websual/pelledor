# CURSOR — Blueprints Pelledor (état projet)

## Contexte

Pelledor est un CMS modulaire (Next.js + Drizzle + PostgreSQL + Auth.js + Stripe).
Un blueprint = configuration métier : modules ON/OFF + seed démo + (optionnel) vitrine template.

## Architecture réelle (repo actuel)

```
content/blueprints/[slug]/
  saas-modules.json
  blueprint.json (optionnel, surtout pour doc métier)

content/blueprints/templates/[slug]/index.html

src/core/blueprint/
  apply-[slug].ts
  defaults-[slug].ts
  render.ts
  server.ts
  admin-menu.ts

src/app/admin/blueprint/
  actions.ts
  apply-[slug]-form.tsx
  page.tsx
```

## Blueprints déjà branchés

- `artisan`
- `gite`
- `hotel`
- `restaurant`
- `praticien`
- `cabinet`
- `immobilier`
- `salon`
- `boutique`
- `avocat`

## Templates présents mais pas (encore) branchés

- `comptable`
- `industriel`
- `mairie`
- `politique`
- `spa`
- `viticole`

## Modules catalogue (actuels)

- `notes`, `stripe`, `directory`, `booking`, `billing`
- `events`, `blog`, `notifications`, `gift-cards`, `chat`
- `lodging`, `artisan-quotes`, `restaurant`, `shop`
- `anamnese`, `click-collect`

## Checklist standard pour un nouveau blueprint

1) `content/blueprints/[slug]/saas-modules.json`
2) `src/core/blueprint/apply-[slug].ts`
3) Si template vitrine:
   - `src/core/blueprint/defaults-[slug].ts`
   - `render.ts` (merge + render)
   - `server.ts` (KEY + getPayload + renderHome)
   - `src/app/page.tsx` (switch `blueprint === "[slug]"`)
4) `src/app/admin/blueprint/actions.ts`
   - import apply/seed
   - ajout `active` autorisé
   - `KEY_BLUEPRINT_PAYLOAD`
   - lecture/écriture payload JSON
   - action `apply[Slug]BusinessBlueprint`
5) `src/app/admin/blueprint/apply-[slug]-form.tsx`
6) `src/app/admin/blueprint/page.tsx`
   - bouton apply
   - option `<select>`
   - textarea payload si template
7) `src/core/blueprint/admin-menu.ts` (ordre métier)
8) `docs/BLUEPRINTS.md` (table + section)
9) `src/core/modules/catalog.ts` si nouveau module
10) Migrations Drizzle si nouveau schéma

## Pattern seed (obligatoire)

- Vérifier existence (profil/données) avant insert
- Utiliser `.returning(...)`
- Toujours :
  - `setModuleToggle()` ON/OFF
  - `blueprint.active` dans `app_settings`
  - copier `content/blueprints/[slug]/saas-modules.json` vers `saas-modules.json`

## Commandes projet

```bash
pnpm saas:build
pnpm db:push      # ou pnpm db:migrate
pnpm build
```

## Priorités métiers (prochain lot)

1. `avocat`
2. `coach`
3. `veterinaire`
4. `photographe`
5. `auto-ecole`
6. `traiteur`

## Voir aussi

- Vision CMS, builder, SEO, agent / MCP : `docs/ROADMAP_CMS_BUILDER_AGENT.md`.

## Notes

- Ne jamais toucher `.env*`.
- Après ajout de tables : migration SQL + journal Drizzle.
- Après ajout de module : vérifier copie routes/API via `pnpm saas:build`.
