# Plan SaaS OS - Valide pour implementation

**Rappel livre blanc** : plateforme **neuve par instance** (type WordPress), modules + thème. Voir `docs/POSITIONNEMENT.md`.

Document de reference aligne sur les choix produit et techniques. La demo couvre les quatre etapes ci-dessous (ordre d execution conseille en fin de document).

---

## 1. Rebuild obligatoire

- Ajout, retrait ou mise a jour majeure d un module : **nouveau build** (CLI + deploy).
- Avantages : graphe de dependances NPM et schémas Drizzle toujours coherents, pas de chargement dynamique de code arbitraire en production.
- L admin peut **preparer** la prochaine config (modules actifs, tokens de theme) ; le **deploiement** applique la config generee.

---

## 2. Admin complet : modules + design system guide

L admin n est pas un simple shell. Il couvre :

| Zone | Contenu |
|------|--------|
| **Modules** | Activer / desactiver (effet au prochain rebuild), dependances, logs d install. |
| **Apparence (theme)** | Parcours guide : palette (couleurs primaire, surface, texte, etats succes/erreur), typographie (polices UI, echelles), **echelle d espacement** (base rem ou scale), **rayons** (radius sm/md/lg), **etats interactifs** (focus ring, hover, disabled). |
| **Apercu** | Live preview des composants du theme (boutons, inputs, cartes) pour valider avant rebuild. |

**Persistance des tokens**

- Stockage en base (table `theme_settings` ou JSONB) : valeurs editables par l utilisateur.
- Au **build** ou au **runtime** (selon choix d impl) : generation de **CSS variables** (`:root`) ou merge dans `tailwind.config` pour que les modules headless consomment uniquement des tokens (`bg-primary`, `rounded-theme-md`, etc.).
- Defaut : theme **base** shippé dans `content/themes/default` ; l admin **surcharge** les tokens sans ecraser les fichiers du theme en repo (sauf export volontaire).

**Rebuild et theme**

- Si le theme est 100% variables + DB : un simple redeploy peut suffire pour refléter les changements (sans regen routes).
- Si tu relies le theme au build Tailwind : rebuild necessaire quand tu changes la structure du design system (nouveaux tokens dans config). A trancher en implementation : **runtime CSS variables** minimise les rebuilds pour la seule couleur/fonts/spacing.

---

## 3. Secrets et installation (inspiration WordPress)

**Fichier `.env` minimal et immuable en prod (genere une fois a l install)**

- `DATABASE_URL` : peut rester en `.env` sur VPS (initie) ; en **push to launch**, injecte par la plateforme.
- `ENCRYPTION_KEY` (ou couple cle derivee) : **32 octets aleatoires**, genere pendant `/install`, ecrit dans `.env` (comme `AUTH_KEY` / `SECURE_AUTH_KEY` dans wp-config).
- Optionnel : sels style WP (`NONCE_SALT`, etc.) si tu en as besoin pour cookies ou signatures.

**En base (chiffre)**

- Cles API modules (Stripe, SMTP, etc.), webhooks, toute valeur que monsieur/madame tout le monde ne doit pas editer en clair.
- Chiffrement : AES-256-GCM (ou libsodium) avec la cle issue de `ENCRYPTION_KEY`.
- Rotation : documenter plus tard (rechiffrement) ; MVP = une cle par instance.

**Flux install**

1. Premier acces : pas de `is_installed` (ou pas de DB) -> redirection `/install`.
2. Collecte DB URL + compte admin + generation des cles -> ecriture `.env` (VPS / volume) **ou** instructions "ajoutez ces lignes" en push-to-launch ou fichier genere telechargeable.
3. Migrations Drizzle + insertion admin + marqueur `is_installed`.
4. Les secrets saisis dans l admin (Stripe, etc.) partent en base chiffree.

---

## 4. Cibles de deploiement

| Public | Mode | Config |
|--------|------|--------|
| Initie | Petit VPS | `.env` a la main, Docker optionnel, rebuild local ou CI. |
| Lambda | Push to launch | Environnement controle ; secrets plateforme + DB chiffree pour le reste. |

---

## Etapes pour la demo (quatre blocs, traiter sequentiellement)

Ordre conseille pour limiter les retours en arriere :

1. **Socle + install + secrets**  
   Repo Next, Drizzle, `/install`, generation `.env` (cles), chiffrement base, flag `is_installed`.

2. **Core + auth + middleware manager + hooks**  
   Module auth, session, middleware compose, EventBus minimal documente.

3. **Admin : modules + theme lab**  
   UI modules (liste, etat "sera actif au prochain build"), UI tokens (couleurs, fonts, spacing, radius, etats), preview, persistance DB + injection CSS variables.

4. **CLI + merge + modules Notes + Stripe**  
   `saas:build` : merge `module.json`, merge schemas, copie routes ; modules Notes + Stripe ; epreuve de feu livre blanc.

La demo = fin du bloc 4. Les blueprints metier et 1-click public restent apres.

---

## Etape 1 — Livre (socle)

- Next.js App Router, Tailwind, middleware `SAAS_INSTALLED`
- `/install` : DATABASE_URL, admin, migration SQL, ecriture `.env.local` (cles + sels)
- Drizzle : `app_settings`, `users`, `encrypted_settings` + `src/core/security/crypto.ts`
- Voir `README.md`

## Etape 2 — Livre

- Auth.js (Credentials), `/login`, `/admin` + layout sidebar via `applyFilters('admin_sidebar_menu')`
- Middleware : pre-install sans JWT ; apres install `auth` + regles `installRule` + `adminAuthRule` (extensible dans `rules.ts`)
- `Hooks` : `doAction` / `addAction`, `applyFilters` / `addFilter` ; `user_created` a l install
- `docs/HOOKS.md`

## Etape 3 — Livre

- `/admin/modules` : catalogue (`src/core/modules/catalog.ts`), toggles en `module_toggles`, message rebuild
- `/admin/appearance` : tokens (couleurs, fonts, spacing, radius, interactif), apercu live, persistance `theme_tokens.payload` JSONB
- Injection admin : `ThemeStyle` + variables `--color-*`, `--font-*`, etc. (`src/core/theme/types.ts`)
- Migration : `drizzle/0001_step3_theme_modules.sql` ; install enchaine tous les `.sql`
- Voir `docs/THEME.md`

## Etape 4 — Livre

- `pnpm saas:build` + `saas:build:audit` (audit critical) + `saas-modules.json`
- Manifeste build : `.saas-build-manifest.json`
- Drizzle : `notes`, `stripe_customers`, `note_access`
- Stripe : checkout + webhook ; hook `user_created` -> customer
- Doc : `docs/ARCHITECTURE.md`, `docs/MODULES_API.md` (MVP Notes+Stripe)

## Prochaine action concrete

1. **Blueprint Artisan** (voir `docs/BLUEPRINTS.md`) : profil modules vitrine + devis/factures + planning.  
2. Webhooks Stripe par **purpose** déjà amorcés ; étendre par module sans gonfler un seul fichier.  
3. i18n : fusion `/locales` par module au build (livre blanc §9).  
4. Supprimer `import/legacy-saas/` quand plus nécessaire en dev.

