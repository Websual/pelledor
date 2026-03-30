# Consigne 038 — Créer blueprint.json pour tous les secteurs

## Contexte

Seul `content/blueprints/artisan/blueprint.json` existe.
Tous les autres dossiers blueprint n'ont qu'un `saas-modules.json`.
Les render functions existent déjà dans `src/core/blueprint/server.ts`.
Il faut créer le `blueprint.json` manquant pour chacun.

## ⛔ NE PAS faire

- Ne pas toucher à Holia, à l'import legacy, aux scripts d'import
- Ne pas créer de nouvelles render functions (elles existent déjà)
- Ne pas modifier `saas-modules.json` (ils sont corrects)
- Ne pas toucher à `src/app/page.tsx`

## À faire

Créer `blueprint.json` dans chacun de ces dossiers, en suivant **exactement** la structure de `content/blueprints/artisan/blueprint.json` comme modèle.

### Fichiers à créer

#### `content/blueprints/cabinet/blueprint.json`
```json
{
  "id": "cabinet",
  "label": "Cabinet (professionnel libéral)",
  "summary": "Vitrine cabinet, prise de RDV en ligne, facturation clients, blog.",
  "business": {
    "needs": [
      { "need": "Identité & présentation", "admin": "Fiche cabinet, spécialité, bio", "modules": ["directory"] },
      { "need": "Prise de RDV en ligne", "admin": "Agenda, créneaux, prestations", "modules": ["booking"] },
      { "need": "Facturation", "admin": "Factures, statuts", "modules": ["billing"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe chiffrées", "modules": ["stripe"] },
      { "need": "Blog / actualités", "admin": "Articles, SEO", "modules": ["blog"] },
      { "need": "Rappels clients", "admin": "Notifications", "modules": ["notifications"] }
    ],
    "modulesOn": ["notes", "stripe", "directory", "booking", "billing", "blog", "notifications"],
    "modulesOff": ["events", "gift-cards", "chat", "artisan-quotes", "lodging", "restaurant", "shop"]
  },
  "frontendTemplate": "cabinet"
}
```

#### `content/blueprints/gite/blueprint.json`
```json
{
  "id": "gite",
  "label": "Gîte / hébergement",
  "summary": "Vitrine gîte, disponibilités, réservation en ligne, paiement.",
  "business": {
    "needs": [
      { "need": "Présentation hébergement", "admin": "Nom, description, photos, équipements", "modules": ["directory"] },
      { "need": "Réservation & disponibilités", "admin": "Calendrier, tarifs, séjour min.", "modules": ["lodging", "booking"] },
      { "need": "Paiement en ligne (acompte)", "admin": "Clés Stripe chiffrées", "modules": ["stripe"] },
      { "need": "Bons cadeaux", "admin": "Création & vente de bons", "modules": ["gift-cards"] },
      { "need": "Blog / actualités", "admin": "Articles, SEO", "modules": ["blog"] }
    ],
    "modulesOn": ["notes", "stripe", "directory", "booking", "lodging", "gift-cards", "blog", "notifications"],
    "modulesOff": ["events", "billing", "artisan-quotes", "chat", "restaurant", "shop"]
  },
  "frontendTemplate": "gite"
}
```

#### `content/blueprints/hotel/blueprint.json`
```json
{
  "id": "hotel",
  "label": "Hôtel",
  "summary": "Vitrine hôtel, chambres, réservation en ligne, paiement.",
  "business": {
    "needs": [
      { "need": "Présentation hôtel & chambres", "admin": "Chambres, tarifs, photos", "modules": ["lodging"] },
      { "need": "Réservation en ligne", "admin": "Calendrier, disponibilités", "modules": ["lodging", "booking"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe chiffrées", "modules": ["stripe"] },
      { "need": "Bons cadeaux", "admin": "Création & vente", "modules": ["gift-cards"] },
      { "need": "Événements & séminaires", "admin": "Agenda événements", "modules": ["events"] }
    ],
    "modulesOn": ["notes", "stripe", "lodging", "booking", "gift-cards", "events", "notifications"],
    "modulesOff": ["billing", "artisan-quotes", "blog", "chat", "directory", "restaurant", "shop"]
  },
  "frontendTemplate": "hotel"
}
```

#### `content/blueprints/immobilier/blueprint.json`
```json
{
  "id": "immobilier",
  "label": "Immobilier",
  "summary": "Vitrine agence, catalogue biens, prise de contact, estimation.",
  "business": {
    "needs": [
      { "need": "Annonce biens (vente/location)", "admin": "Catalogue, fiches biens", "modules": ["directory"] },
      { "need": "Prise de RDV visite", "admin": "Agenda, créneaux", "modules": ["booking"] },
      { "need": "Blog / actualités marché", "admin": "Articles SEO", "modules": ["blog"] },
      { "need": "Événements portes ouvertes", "admin": "Agenda événements", "modules": ["events"] }
    ],
    "modulesOn": ["notes", "directory", "booking", "blog", "events", "notifications"],
    "modulesOff": ["stripe", "billing", "artisan-quotes", "gift-cards", "chat", "lodging", "restaurant", "shop"]
  },
  "frontendTemplate": "immobilier"
}
```

#### `content/blueprints/praticien/blueprint.json`
```json
{
  "id": "praticien",
  "label": "Praticien bien-être",
  "summary": "Vitrine thérapeute / coach, RDV en ligne, paiement, bons cadeaux.",
  "business": {
    "needs": [
      { "need": "Présentation praticien & soins", "admin": "Fiche, prestations, tarifs", "modules": ["directory"] },
      { "need": "RDV en ligne", "admin": "Agenda, créneaux, prestations", "modules": ["booking"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe chiffrées", "modules": ["stripe"] },
      { "need": "Bons cadeaux", "admin": "Création & vente", "modules": ["gift-cards"] },
      { "need": "Facturation", "admin": "Factures, statuts", "modules": ["billing"] }
    ],
    "modulesOn": ["notes", "stripe", "directory", "booking", "billing", "gift-cards", "notifications"],
    "modulesOff": ["events", "blog", "artisan-quotes", "chat", "lodging", "restaurant", "shop"]
  },
  "frontendTemplate": "praticien"
}
```

#### `content/blueprints/restaurant/blueprint.json`
```json
{
  "id": "restaurant",
  "label": "Restaurant",
  "summary": "Vitrine restaurant, menu, réservation en ligne, événements.",
  "business": {
    "needs": [
      { "need": "Menu & carte", "admin": "Catégories, plats, prix, allergènes", "modules": ["restaurant"] },
      { "need": "Réservation table", "admin": "Agenda, couverts, créneaux", "modules": ["booking"] },
      { "need": "Événements (soirées, privatisation)", "admin": "Agenda événements", "modules": ["events"] },
      { "need": "Bons cadeaux", "admin": "Création & vente", "modules": ["gift-cards"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe chiffrées", "modules": ["stripe"] }
    ],
    "modulesOn": ["notes", "stripe", "restaurant", "booking", "events", "gift-cards", "notifications"],
    "modulesOff": ["billing", "artisan-quotes", "blog", "chat", "directory", "lodging", "shop"]
  },
  "frontendTemplate": "restaurant"
}
```

#### `content/blueprints/salon/blueprint.json`
```json
{
  "id": "salon",
  "label": "Salon / beauté",
  "summary": "Vitrine salon, prestations beauté, RDV en ligne, paiement.",
  "business": {
    "needs": [
      { "need": "Prestations & tarifs", "admin": "Catalogue soins, durées, prix", "modules": ["directory", "booking"] },
      { "need": "RDV en ligne", "admin": "Agenda, créneaux, équipe", "modules": ["booking"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe chiffrées", "modules": ["stripe"] },
      { "need": "Bons cadeaux", "admin": "Création & vente", "modules": ["gift-cards"] },
      { "need": "Fidélité / notifications", "admin": "Notifications clients", "modules": ["notifications"] }
    ],
    "modulesOn": ["notes", "stripe", "directory", "booking", "gift-cards", "notifications"],
    "modulesOff": ["billing", "artisan-quotes", "blog", "events", "chat", "lodging", "restaurant", "shop"]
  },
  "frontendTemplate": "salon"
}
```

## Vérification

Après création, vérifier que chaque fichier est du JSON valide :
```bash
for f in content/blueprints/*/blueprint.json; do echo -n "$f: "; python3 -c "import json,sys; json.load(open('$f')); print('OK')" 2>&1; done
```
