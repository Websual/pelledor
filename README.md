# Pelledor

Plateforme modulaire type **CMS** : cœur commun, **modules** activables, **thème** headless, **installation** sur base PostgreSQL vierge (parcours `/install`).

## Prérequis

- Node 20+, pnpm  
- PostgreSQL (Neon, Supabase, Docker, etc.)

## Installation

```bash
pnpm install
pnpm dev
```

Sans `SAAS_INSTALLED=true`, les requêtes hors assets sont redirigées vers **`/install`**.

1. Ouvrir `http://localhost:3000/install`  
2. Renseigner `DATABASE_URL`, email et mot de passe admin  
3. Le serveur écrit `.env.local` si possible (sinon copier le bloc affiché)  
4. **Redémarrer** `pnpm dev` pour charger `DATABASE_URL` et les clés  

## Bootstrap VPS (Ubuntu/Debian)

Pour une machine neuve, un script est fourni pour préparer le serveur
(Node, pnpm, pm2, nginx), installer les dépendances et lancer l'application.

```bash
chmod +x scripts/vps-bootstrap-ubuntu.sh
sudo APP_DIR=/var/www/pelledor DOMAIN=votre-domaine.com ./scripts/vps-bootstrap-ubuntu.sh
```

Ensuite, ouvrez `http://votre-domaine.com/install` pour terminer la configuration
applicative (base, compte admin, blueprint).

| Variable | Rôle |
|----------|------|
| `ENCRYPTION_KEY` | Chiffrement des secrets en base |
| `AUTH_SECRET` | Sessions (Auth.js) |
| `NONCE_SALT` / `SECURE_AUTH_SALT` | Sels optionnels |
| `SAAS_INSTALLED=true` | Fin du mode installation |

## Base de données

Avec `DATABASE_URL` :

```bash
pnpm db:push    # aligner le schéma (dev)
pnpm db:migrate # appliquer drizzle/*.sql
```

Première install : enchaîner les migrations dans l’ordre (`0000_init` → … → `0003_platform_modules` selon le journal Drizzle).

## Modules (build)

Les routes et schémas des modules sous `content/modules/` sont fusionnés au déploiement :

```bash
pnpm saas:build
# avant prod (livre blanc §5 — audit NPM critique) :
pnpm saas:build:audit
```

Puis `pnpm build` / déploiement habituel. Le fichier **`.saas-build-manifest.json`** résume modules copiés et conflits de versions.

## Documentation (fonctionnement)

| Doc | Contenu |
|-----|--------|
| [docs/INSTALL.md](docs/INSTALL.md) | Installation détaillée, variables, migrations |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Déploiement serveur (PM2/Nginx) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Core, modules, thème, build (livre blanc) |
| [docs/MODULES_API.md](docs/MODULES_API.md) | API des modules, flux Notes + Stripe |
| [docs/HOOKS.md](docs/HOOKS.md) | Hooks / événements |
| [docs/BLUEPRINTS.md](docs/BLUEPRINTS.md) | Blueprints vitrine + `content/blueprints/templates/` |

## Structure utile

- `src/core/` — DB Drizzle, sécurité, hooks  
- `src/app/install/` — assistant d’installation  
- `content/modules/` — modules (fusionnés par `saas:build`)  
- `scripts/saas-build.mjs` — CLI de fusion  

Auth : Auth.js (Credentials), `/login`, `/admin` (protégé).

## Import optionnel de données

Cas marginal (données de test depuis une autre base PostgreSQL au schéma compatible) :

```bash
SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... pnpm import:legacy --dry-run
```

Ce n’est **pas** le parcours standard d’onboarding.
