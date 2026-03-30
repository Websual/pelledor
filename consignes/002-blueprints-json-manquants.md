# Consigne 002 — Ajouter blueprint.json aux blueprints existants

## Contexte
Seul le blueprint "artisan" possède un `blueprint.json` complet.
Les 8 autres blueprints n'ont qu'un `saas-modules.json`.

Fichier de référence : `content/blueprints/artisan/blueprint.json`

## Tâche — Créer les blueprint.json manquants

Pour chaque dossier listé ci-dessous, créer `content/blueprints/<id>/blueprint.json`
en suivant EXACTEMENT la structure du blueprint artisan.

Les `modulesOn` doivent correspondre au `saas-modules.json` déjà présent.

---

### `content/blueprints/restaurant/blueprint.json`
```json
{
  "id": "restaurant",
  "label": "Restaurant",
  "summary": "Menu en ligne, réservations de tables, gestion salle, paiement en ligne.",
  "business": {
    "needs": [
      { "need": "Menu & carte", "admin": "Admin restaurant → Menu", "modules": ["restaurant"] },
      { "need": "Réservations de tables", "admin": "Admin RDV", "modules": ["booking"] },
      { "need": "Bons cadeaux", "admin": "Admin gift-cards", "modules": ["gift-cards"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe chiffrées", "modules": ["stripe"] },
      { "need": "Blog / actualités", "admin": "Admin blog", "modules": ["blog"] }
    ],
    "modulesOn": ["restaurant", "booking", "gift-cards", "stripe", "blog", "notifications"],
    "modulesOff": ["shop", "billing", "artisan-quotes", "lodging", "events", "chat", "directory", "notes"]
  },
  "frontendTemplate": "restaurant"
}
```

---

### `content/blueprints/salon/blueprint.json`
```json
{
  "id": "salon",
  "label": "Salon (coiffure, beauté)",
  "summary": "Prise de RDV en ligne, prestations, équipe, paiement.",
  "business": {
    "needs": [
      { "need": "Catalogue prestations", "admin": "Directory → Prestations", "modules": ["directory", "booking"] },
      { "need": "Agenda & RDV en ligne", "admin": "Admin RDV", "modules": ["booking"] },
      { "need": "Bons cadeaux", "admin": "Admin gift-cards", "modules": ["gift-cards"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe", "modules": ["stripe"] },
      { "need": "Notifications rappels", "admin": "Admin notifications", "modules": ["notifications"] }
    ],
    "modulesOn": ["booking", "directory", "gift-cards", "stripe", "notifications"],
    "modulesOff": ["shop", "billing", "artisan-quotes", "lodging", "restaurant", "events", "blog", "chat", "notes"]
  },
  "frontendTemplate": "salon"
}
```

---

### `content/blueprints/hotel/blueprint.json`
```json
{
  "id": "hotel",
  "label": "Hôtel",
  "summary": "Chambres & tarifs, réservations en ligne, paiement Stripe.",
  "business": {
    "needs": [
      { "need": "Chambres & disponibilités", "admin": "Admin hébergement → Chambres", "modules": ["lodging"] },
      { "need": "Réservations en ligne", "admin": "Admin RDV / hébergement", "modules": ["lodging", "booking"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe", "modules": ["stripe"] },
      { "need": "Blog / actualités", "admin": "Admin blog", "modules": ["blog"] }
    ],
    "modulesOn": ["lodging", "booking", "stripe", "blog", "notifications"],
    "modulesOff": ["shop", "billing", "artisan-quotes", "restaurant", "events", "gift-cards", "chat", "directory", "notes"]
  },
  "frontendTemplate": "hotel"
}
```

---

### `content/blueprints/gite/blueprint.json`
```json
{
  "id": "gite",
  "label": "Gîte / hébergement",
  "summary": "Location saisonnière, réservations, disponibilités, paiement.",
  "business": {
    "needs": [
      { "need": "Chambres / logements", "admin": "Admin hébergement", "modules": ["lodging"] },
      { "need": "Réservations & calendrier", "admin": "Admin réservations", "modules": ["lodging", "booking"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe", "modules": ["stripe"] },
      { "need": "Notes internes", "admin": "Notes", "modules": ["notes"] }
    ],
    "modulesOn": ["lodging", "booking", "stripe", "notes", "notifications"],
    "modulesOff": ["shop", "billing", "artisan-quotes", "restaurant", "events", "blog", "gift-cards", "chat", "directory"]
  },
  "frontendTemplate": "gite"
}
```

---

### `content/blueprints/cabinet/blueprint.json`
```json
{
  "id": "cabinet",
  "label": "Cabinet (pro libéral)",
  "summary": "Consultation sur RDV, facturation, paiement en ligne.",
  "business": {
    "needs": [
      { "need": "Profil & spécialité", "admin": "Directory → Praticien", "modules": ["directory"] },
      { "need": "RDV en ligne", "admin": "Admin RDV", "modules": ["booking"] },
      { "need": "Facturation", "admin": "Admin factures", "modules": ["billing"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe", "modules": ["stripe"] }
    ],
    "modulesOn": ["directory", "booking", "billing", "stripe", "notifications"],
    "modulesOff": ["shop", "artisan-quotes", "lodging", "restaurant", "events", "blog", "gift-cards", "chat", "notes"]
  },
  "frontendTemplate": "cabinet"
}
```

---

### `content/blueprints/praticien/blueprint.json`
```json
{
  "id": "praticien",
  "label": "Praticien bien-être",
  "summary": "Séances, RDV en ligne, bons cadeaux, paiement.",
  "business": {
    "needs": [
      { "need": "Profil & séances", "admin": "Directory → Praticien", "modules": ["directory"] },
      { "need": "RDV en ligne", "admin": "Admin RDV", "modules": ["booking"] },
      { "need": "Bons cadeaux", "admin": "Admin gift-cards", "modules": ["gift-cards"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe", "modules": ["stripe"] }
    ],
    "modulesOn": ["directory", "booking", "gift-cards", "stripe", "blog", "notifications"],
    "modulesOff": ["shop", "billing", "artisan-quotes", "lodging", "restaurant", "events", "chat", "notes"]
  },
  "frontendTemplate": "praticien"
}
```

---

### `content/blueprints/immobilier/blueprint.json`
```json
{
  "id": "immobilier",
  "label": "Immobilier (agence)",
  "summary": "Annonces, biens, estimation en ligne, contact agence.",
  "business": {
    "needs": [
      { "need": "Catalogue biens", "admin": "Directory → Biens", "modules": ["directory"] },
      { "need": "Prise de RDV visite", "admin": "Admin RDV", "modules": ["booking"] },
      { "need": "Blog / actualités marché", "admin": "Admin blog", "modules": ["blog"] },
      { "need": "Notifications leads", "admin": "Admin notifications", "modules": ["notifications"] }
    ],
    "modulesOn": ["directory", "booking", "blog", "notifications"],
    "modulesOff": ["shop", "billing", "artisan-quotes", "lodging", "restaurant", "events", "gift-cards", "stripe", "chat", "notes"]
  },
  "frontendTemplate": "immobilier"
}
```

## Ce qu'il ne faut PAS faire
- ❌ Ne pas modifier les actions.ts ni les apply-*.ts
- ❌ Ne pas créer de nouvelles routes
- ❌ Ne pas modifier le schéma Drizzle
- ❌ Ne pas toucher aux saas-modules.json existants (ils sont corrects)
- ❌ Ne pas créer de scripts d'import ou de migration

## Validation
`pnpm saas:build` doit tourner sans erreur après ces ajouts.
