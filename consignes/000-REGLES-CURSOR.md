# RÈGLES CURSOR — SaaS OS MVP

**Lire en premier. Toujours.**

## Ce projet EST

Un CMS modulaire Next.js, style WordPress :
- Installation sur PostgreSQL vierge via `/install`
- Modules activables (shop, booking, billing, stripe, etc.)
- Blueprints métiers (restaurant, boutique, hôtel, artisan…)
- Thème headless personnalisable via l'admin

## Ce projet N'EST PAS

- ❌ Une migration du SaaS Holia existant → NE PAS créer de scripts d'import
- ❌ Un remplacement de production → c'est un MVP indépendant
- ❌ Un système multi-tenant → une instance = un client
- ❌ Un projet Docker/CI/CD → déploiement manuel VPS pour MVP

## Règles de travail

1. **Lire la consigne complète avant de coder**
2. **Ne travailler QUE sur ce qui est demandé dans la consigne**
3. **Ne pas créer de nouveaux fichiers non demandés**
4. **Ne pas modifier le schéma Drizzle** sauf consigne explicite
5. **Ne pas ajouter de dépendances NPM** sauf si la consigne le demande
6. **Toujours vérifier** que `pnpm saas:build` tourne après chaque consigne

## Ordre des consignes

Traiter dans l'ordre numérique :
- `001-blueprint-boutique.md` — ajouter le blueprint ecommerce manquant
- `002-blueprints-json-manquants.md` — créer les blueprint.json pour tous les secteurs
- `003-build-et-install-test.md` — valider le build prod et le wizard install
- `004-admin-blueprint-selector.md` — UX admin blueprints

## Archivage

Quand une consigne est terminée, déplacer le fichier dans `consignes/archive/`.
