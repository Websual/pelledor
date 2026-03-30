# Installation SaaS OS

## 1. Environnement

- **Node** 20+  
- **pnpm**  
- **PostgreSQL** (URL de connexion type `postgresql://user:pass@host:5432/dbname`)

## 2. Dépendances et serveur de dev

```bash
pnpm install
pnpm dev
```

## 3. Assistant `/install`

Tant que `SAAS_INSTALLED` n’est pas défini à `true`, l’application redirige vers `/install`.

1. Créer une base PostgreSQL vide.  
2. Ouvrir `/install`, saisir `DATABASE_URL`, email admin, mot de passe.  
3. Récupérer le bloc `.env.local` généré (ou le créer à la main).  
4. Redémarrer le process Node pour charger les variables.

## 4. Migrations

```bash
export DATABASE_URL="postgresql://..."
pnpm db:migrate
```

Les fichiers SQL sont listés dans `drizzle/meta/_journal.json`. En cas de première machine, appliquer toutes les entrées dans l’ordre.

## 5. Modules (`saas:build`)

Après modification de la liste de modules ou du contenu sous `content/modules/` :

```bash
pnpm saas:build
pnpm build   # build Next.js
```

## 6. Production

- Définir `AUTH_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`, `SAAS_INSTALLED=true`.  
- Lancer `pnpm saas:build` puis `pnpm build` et `pnpm start` (ou équivalent Docker/CI).  
- Configurer Stripe, webhooks, etc. selon les modules activés (voir `docs/MODULES_API.md`).
