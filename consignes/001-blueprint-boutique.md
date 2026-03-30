# Consigne 001 — Blueprint Boutique (e-commerce)

## Contexte
Le blueprint "boutique" est partiellement implémenté :
- ✅ `content/blueprints/boutique/saas-modules.json` (modules: shop, stripe, notes)
- ✅ `src/core/blueprint/apply-boutique.ts` (toggles + seed shipping)
- ✅ `src/app/admin/blueprint/apply-boutique-form.tsx` (UI admin)
- ✅ `src/app/admin/blueprint/actions.ts` → `applyBoutiqueBusinessBlueprint()`
- ✅ Module `shop` complet dans `content/modules/shop/` (routes: boutique, cart, categories, checkout, orders, products, shipping)
- ❌ `content/blueprints/boutique/blueprint.json` — MANQUANT
- ❌ `content/blueprints/boutique/` absent du `registry.json`
- ❌ Template vitrine `content/blueprints/templates/boutique/index.html` — MANQUANT

## Tâche 1 — Créer `content/blueprints/boutique/blueprint.json`

Modèle : voir `content/blueprints/artisan/blueprint.json` pour la structure exacte.

Contenu attendu :
```json
{
  "id": "boutique",
  "label": "Boutique (e-commerce)",
  "summary": "Catalogue produits, panier, commandes, paiement Stripe, frais de port.",
  "business": {
    "needs": [
      {
        "need": "Catalogue produits & catégories",
        "admin": "Admin shop → Produits, catégories",
        "modules": ["shop"]
      },
      {
        "need": "Panier & tunnel d'achat",
        "admin": "Automatique via module shop",
        "modules": ["shop"]
      },
      {
        "need": "Frais de port & zones",
        "admin": "Admin shop → Livraison",
        "modules": ["shop"]
      },
      {
        "need": "Paiement en ligne Stripe",
        "admin": "Clés Stripe chiffrées dans Réglages",
        "modules": ["stripe"]
      },
      {
        "need": "Gestion commandes",
        "admin": "Admin shop → Commandes",
        "modules": ["shop"]
      },
      {
        "need": "Notes internes",
        "admin": "Notes",
        "modules": ["notes"]
      }
    ],
    "modulesOn": ["shop", "stripe", "notes", "notifications"],
    "modulesOff": ["booking", "billing", "events", "blog", "gift-cards", "artisan-quotes", "chat", "directory", "lodging", "restaurant"]
  },
  "frontendTemplate": "boutique"
}
```

## Tâche 2 — Ajouter boutique au `content/blueprints/registry.json`

Ajouter cette entrée dans le tableau `templates` (après "artisan", ordre alphabétique ou logique) :

```json
{ "id": "boutique", "label": "Boutique (e-commerce)", "dir": "boutique" }
```

## Tâche 3 — Template vitrine `content/blueprints/templates/boutique/index.html`

Créer un fichier `index.html` **statique** (pas de React/JSX) avec `{{VARIABLES}}` comme les autres templates (voir `content/blueprints/templates/artisan/index.html` pour le pattern).

Le template boutique doit contenir :
- Hero : nom boutique, accroche, CTA "Voir le catalogue" → `/boutique`
- Section "Nos catégories" : 3 placeholders avec `{{CAT_1_NOM}}`, `{{CAT_1_IMAGE}}`, lien `/boutique/categorie/{{CAT_1_SLUG}}`
- Section "Nos produits phares" : 4 cards produits avec `{{PRODUIT_1_NOM}}`, `{{PRODUIT_1_PRIX}}`, `{{PRODUIT_1_IMAGE}}`, bouton "Ajouter au panier"
- Section "Pourquoi nous choisir" : 3 arguments avec icônes Lucide (livraison rapide, paiement sécurisé, satisfaction garantie)
- Footer minimaliste

Variables à utiliser : `{{NOM_BOUTIQUE}}`, `{{ACCROCHE}}`, `{{VILLE}}`, `{{EMAIL}}`, `{{COULEUR_PRIMAIRE}}`

Utiliser Lucide icons (via `/lucide.min.js` comme les autres templates), Inter font, dark/light toggle, responsive mobile-first.

Ne PAS créer de fichiers React, de composants Next.js, ni de routes. Ce fichier est un template HTML statique uniquement.

## Tâche 4 — Vérifier `setBlueprintBoutiqueActive`

Dans `src/core/blueprint/server.ts`, vérifier qu'il existe une fonction `setBlueprintBoutiqueActive()` qui persiste `blueprint_active = "boutique"` en base (même pattern que `setBlueprintActive` pour artisan). Si manquante, l'ajouter.

## Ce qu'il ne faut PAS faire
- ❌ Ne pas toucher au module shop (il est complet)
- ❌ Ne pas créer de scripts d'import ou de migration
- ❌ Ne pas modifier les actions.ts admin (déjà fonctionnel)
- ❌ Ne pas créer de nouvelles routes Next.js
- ❌ Ne pas modifier le schéma Drizzle

## Validation
Une fois terminé, lancer `pnpm saas:build` et vérifier qu'il n'y a pas d'erreur.
