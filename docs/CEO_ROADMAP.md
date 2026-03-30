# SaaS OS - CEO Roadmap

## État actuel à confirmer
- Core Next.js/Drizzle/Auth déjà présent
- Install flow présent
- Admin présent
- Blueprints métier déjà amorcés
- Builder / modules déjà amorcés
- État exact UX / simplicité / cohérence produit à auditer plus finement

## Phase 1 — Audit & clarification produit
- [x] Auditer l'état réel du wizard d'installation — riche, fonctionnel, 9 blueprints présents
- [x] Auditer l'état réel de l'admin modules / apparence — présent
- [x] Auditer le système de blueprints métier déjà implémenté — très avancé (artisan, restaurant, gite, hotel, praticien, cabinet, immobilier, salon, boutique)
- [x] Identifier le gap entre la vision "WordPress du SaaS" et l'existant — l'install forçait le blueprint "artisan" en dur, build cassé sur 3 erreurs TS
- [x] Écrire la roadmap priorisée V1

## Corrections réalisées (2026-03-27)
- Fix wizard install: le choix du blueprint est maintenant dans le formulaire d'installation (select parmi les 9 métiers)
- Fix build TS: shop/checkout missing description, checkout-form Link manquant, restaurant/shop Date→string, page.tsx prerender
- Build OK ✓

## Phase 2 - Wedge produit
- [x] Définir les 3 premiers métiers à rendre excellents → **Artisan, Praticien, Restaurant** (top 3 par volume cible et couverture modules)
- [x] Documenter le flow de déploiement complet → `docs/DEPLOY.md` + `ecosystem.config.cjs`
- [x] ecosystem.config.cjs prêt (port 3001, PM2)
- [ ] **BLOQUÉ** : déploiement démo en attente de `.env.local` (DATABASE_URL + secrets) — besoin de Luc
- [x] Wizard ultra simple : post-install affiche le blueprint choisi + lien direct /admin/blueprint ; admin/blueprint affiche un banner onboarding si active="none"
- [x] Expérience "choisir un métier → app en 5 min" : friction identifiée = rebuild CLI requis après Apply
- [x] Bouton Rebuild dans /admin/blueprint → `/api/admin/rebuild` (POST lance build en background, GET poll statut)
- [x] Admin apparence : tokens live preview — déjà implémenté via CSS variables runtime dans `/admin/appearance`

## Phase 3 - Exécution produit
- [x] Bouton Rebuild dans /admin/blueprint → RebuildButton.tsx (polling statut, logs, autorestart)
- [x] Améliorer le wizard (étape 3: RebuildButton remonté juste après Apply forms — visible immédiatement)
- [x] Améliorer l'admin type WordPress (simplifier la nav — orderMenu retourne seulement les items blueprint actif, pas toute la liste)
- [ ] Renforcer les blueprints métier prioritaires (artisan en priorité)
- [ ] Ajouter les modules manquants les plus transverses
- [ ] Produire une démonstration forte de valeur (instance démo publique — bloqué attente DB Luc)

## Phase 4 - Expansion bibliothèque
- [x] Standardiser la méthode d'ajout de nouveaux métiers → `docs/ADDING_BLUEPRINT.md` (guide step-by-step ~30 min)
- [x] Standardiser la méthode d'ajout de nouveaux modules → `docs/ADDING_MODULE.md` (guide step-by-step ~25 min)
- [ ] Capitaliser en bibliothèque de modules réutilisables
- [ ] Préparer la boucle de distribution / packaging futur
