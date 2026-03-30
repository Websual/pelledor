# Consigne 004 — Admin : sélecteur de blueprint propre

## Contexte
La page `/admin/blueprint` contient déjà les formulaires pour chaque blueprint.
L'objectif est de s'assurer que l'UX est claire et que tous les blueprints sont accessibles.

## Tâche 1 — Vérifier que tous les blueprints ont leur ApplyForm

Dans `src/app/admin/blueprint/page.tsx`, vérifier que les blueprints suivants ont bien un formulaire affiché :
- ✅ Artisan (ApplyBusinessForm)
- ✅ Boutique (ApplyBoutiqueForm)
- ✅ Restaurant (ApplyRestaurantForm)
- ✅ Hôtel (ApplyHotelForm)
- ✅ Praticien (ApplyPraticienForm)
- ✅ Cabinet (ApplyCabinetForm)
- ✅ Immobilier (ApplyImmobilierForm)
- ✅ Salon (ApplySalonForm)
- ✅ Gîte (ApplyGiteForm)

Si certains sont absents de la page mais ont leur action dans `actions.ts`, les ajouter.

## Tâche 2 — Afficher le blueprint actif clairement

Dans `/admin/blueprint/page.tsx`, afficher en haut de page :
- Le blueprint actuellement actif (via `getBlueprintActive()`)
- Un badge/label coloré (ex: "Actif : Restaurant")
- Si aucun actif : "Aucun blueprint sélectionné — choisissez votre secteur ci-dessous"

## Tâche 3 — Message post-application

Après application d'un blueprint, le message de succès doit indiquer clairement :
1. Ce qui a été activé
2. Que `pnpm saas:build && pnpm build` est nécessaire pour appliquer en production
3. L'URL principale du module (ex: `/boutique`, `/restaurant`, `/hebergement`)

Ces messages sont déjà dans `actions.ts` via le champ `hint`. Vérifier qu'ils sont affichés dans les formulaires.

## Ce qu'il ne faut PAS faire
- ❌ Ne pas refactorer la page admin en entier
- ❌ Ne pas créer de nouveau système de routing pour les blueprints
- ❌ Ne pas modifier les actions.ts (sauf si un bug bloquant est trouvé)
- ❌ Ne pas ajouter de dépendances

## Validation
- Tous les blueprints sont accessibles depuis `/admin/blueprint`
- Le blueprint actif est visible clairement
- Les messages post-application sont informatifs
