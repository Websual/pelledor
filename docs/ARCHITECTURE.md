# Architecture SaaS OS (livre blanc)

## Couches

| Couche | Rôle | Emplacement |
|--------|------|-------------|
| **Core** | Auth, DB, hooks, chiffrement, règles middleware | `src/core/` |
| **Modules** | Briques métier (API + pages), manifeste NPM | `content/modules/<name>/` |
| **Thème** | Tokens UI, preview admin | `content/themes/`, `theme_tokens` en base |
| **Build** | Fusion deps + copie routes vers App Router | `pnpm saas:build` → `src/app/(modules)/`, `api/modules/` |

## Flux build (MVP livre blanc)

1. **`saas-modules.json`** liste les modules actifs.
2. **`saas:build`** fusionne les `module.json` → `package.json` ; copie `routes/` et `api/` dans l’arbre Next.js.
3. **`pnpm install`** résout le graphe NPM (une seule version par paquet ; conflits loggés dans `.saas-build-manifest.json`).
4. **`pnpm saas:build:audit`** (recommandé avant prod) : install + `pnpm audit --audit-level=critical`.
5. **Drizzle** : schéma core + `schema.modules.ts` (tables partagées démo) ; modules Notes/Stripe ont leurs tables dans le schéma core ou migrations dédiées selon évolution.
6. **`pnpm build`** : image déployable.

## Hooks (cœur du livre blanc §9)

- **Actions** : `user_created`, `ticket_purchased`, etc. → modules indépendants (ex. Stripe écoute `user_created`).
- **Filtres** : `admin_sidebar_menu` → enrichissement menu sans couplage.

Voir **`docs/HOOKS.md`**.

## Middleware

Un seul fichier Edge Next.js : le core enchaîne règles (install, session admin). Les modules documentent leurs besoins ; extension dans `src/core/middleware/rules.ts` + rebuild.

## UI headless (livre blanc §6)

Les modules s’appuient sur des **tokens** (CSS variables injectées depuis l’admin), pas sur du CSS figé par module. Thème par défaut : `content/themes/default`.

## Onboarding (livre blanc §10)

Premier lancement → **`/install`** → DB + admin + clés → `SAAS_INSTALLED=true`. Pas de FTP : build CI + variables d’environnement sur l’hébergeur.

## Blueprints (après MVP)

Packs métier (ex. **Artisan**) = même core + sous-ensemble de modules + contenu seed. Voir **`docs/BLUEPRINTS.md`**.
