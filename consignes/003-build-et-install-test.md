# Consigne 003 — Build production & test install wizard

## Contexte
Le projet n'a jamais été buildé en production (pas de `.next/standalone`).
L'objectif est de valider que `pnpm build` passe proprement et que le wizard `/install` fonctionne.

## Tâche 1 — Fixer les erreurs de build TypeScript

Lancer `pnpm build` depuis `/var/www/saas-os/`.

Si des erreurs TypeScript/ESLint bloquent le build :
- Corriger les erreurs **dans les fichiers concernés**
- Ne PAS désactiver TypeScript ou ajouter `// @ts-ignore` en masse
- Ne PAS modifier `tsconfig.json` pour ignorer des erreurs

Erreurs acceptables (warnings) : variables inutilisées mineures.
Erreurs inacceptables : imports manquants, types incompatibles, fichiers introuvables.

## Tâche 2 — Vérifier le wizard /install end-to-end

Ouvrir mentalement (ou tester) le flow suivant :

1. Sans `SAAS_INSTALLED=true` → app doit rediriger vers `/install`
2. Le formulaire `/install` demande : `DATABASE_URL`, email admin, mot de passe
3. Après soumission : génère `ENCRYPTION_KEY` (32 bytes random hex), `AUTH_SECRET`, `NONCE_SALT`
4. Écrit `.env.local` **ou** affiche le bloc à copier
5. Lance les migrations Drizzle (`0000_init.sql` → dernier fichier dans `drizzle/meta/_journal.json`)
6. Crée le compte admin en base
7. Définit `SAAS_INSTALLED=true`

Vérifier dans `src/app/install/actions.ts` que ces étapes sont bien implémentées.
Si une étape est manquante ou cassée, la corriger.

**Point critique** : la migration doit appliquer TOUS les fichiers SQL dans l'ordre du journal.
Vérifier que `drizzle/meta/_journal.json` liste tous les fichiers de `0000_init` à `0007_shop_ecommerce`.

## Tâche 3 — README install simplifié

Mettre à jour `README.md` section Installation pour qu'elle soit aussi simple que possible :

```
1. pnpm install
2. pnpm dev  (ou pnpm build && pnpm start)
3. Ouvrir http://localhost:3000/install
4. Renseigner l'URL PostgreSQL + email + mot de passe → Installer
5. Redémarrer le process (copier le bloc .env affiché)
6. Connectez-vous → Admin → Blueprints → choisir votre secteur
```

Pas plus long que ça. Le détail technique reste dans `docs/INSTALL.md`.

## Ce qu'il ne faut PAS faire
- ❌ Ne pas créer de Docker, Dockerfile, docker-compose
- ❌ Ne pas créer de scripts bash d'installation automatique
- ❌ Ne pas modifier le schéma Drizzle
- ❌ Ne pas ajouter de dépendances NPM non nécessaires
- ❌ Ne pas créer de système de "one-click deploy"

## Validation
- `pnpm build` termine sans erreur
- `.next/` contient les pages compilées
- Le wizard `/install` est fonctionnel (code review suffit si pas de DB dispo)
