# Consigne 040 — Build prod propre + vérifications MVP

## Contexte

Le projet n'a jamais tourné un `pnpm build` propre jusqu'en production.
Il faut valider que tout compile, identifier et corriger les erreurs TypeScript/ESLint bloquantes.

## ⛔ NE PAS faire

- Ne pas ajouter de nouveaux features pendant cette consigne — c'est une passe de stabilisation uniquement
- Ne pas supprimer des fichiers sans comprendre leur rôle
- Ne pas toucher aux scripts d'import legacy (`import/` et `scripts/import-legacy.mjs`)
- Ne pas "améliorer" le code qui fonctionne — corriger uniquement ce qui bloque le build

## Étapes

### 1. Lancer le build et noter les erreurs

```bash
cd /var/www/saas-os
pnpm saas:build
pnpm build 2>&1 | tee /tmp/build-output.txt
```

### 2. Corriger les erreurs TypeScript bloquantes

Traiter **uniquement** les erreurs `Type error:` qui font échouer le build.
Les warnings ESLint non-bloquants peuvent être ignorés pour le MVP.

Priorité de correction :
1. Erreurs dans `src/app/` et `src/core/` — interfaces manquantes, imports cassés
2. Erreurs dans `src/modules/` — types Drizzle, paramètres manquants
3. Ne pas corriger les erreurs dans `import/` ni `scripts/` — ces dossiers sont hors scope MVP

### 3. Vérifier les pages critiques compilent

Après build réussi, vérifier que ces routes existent dans `.next/server/app/` :
- `page.html` (home)
- `install/page.html`
- `login/page.html`
- `admin/page.html`
- `boutique/page.html` (module shop)

### 4. Test de démarrage

```bash
pnpm start &
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
# Doit retourner 200 ou 307 (redirect vers /install si pas configuré)
```

### 5. Documenter les variables d'environnement requises

Mettre à jour `README.md` section "Variables" si des variables manquent dans `.env.example`.
Les variables minimales pour démarrer :
- `DATABASE_URL`
- `ENCRYPTION_KEY` (généré par /install)
- `AUTH_SECRET` (généré par /install)
- `SAAS_INSTALLED=true` (après install)

## Résultat attendu

`pnpm build` termine sans `Type error:` fatal.
`pnpm start` démarre et répond sur le port 3000.
Rapport final : liste des erreurs corrigées + liste des warnings restants (non-bloquants).

## Note importante

Si des erreurs TypeScript viennent de modules qui ne sont pas dans `saas-modules.json` actif,
vérifier d'abord si le module est importé conditionnellement ou toujours — corriger le type,
ne pas désactiver le module.
