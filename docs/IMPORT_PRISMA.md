# Import optionnel de données

## Usage

Script **`pnpm import:legacy`** : copie ciblée depuis une base PostgreSQL source (schéma compatible : `users`, `professions`, `practitioners`, `services`, etc.) vers une base SaaS OS déjà migrée.

Variables : `SOURCE_DATABASE_URL`, `TARGET_DATABASE_URL`. Option `--dry-run`.

## Ce que ce n’est pas

- Ce n’est **pas** le parcours produit : une instance normale = **install** + modules + données créées dans l’admin.  
- Ne pas documenter l’import comme étape standard de l’onboarding public.
