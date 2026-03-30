# Consigne 039 — Blueprint Boutique : vitrine template + registry

## Contexte

Le blueprint "boutique" est fonctionnel côté backend (apply-boutique.ts, admin form, module shop).
Mais la home page est un stub JSX hardcodé dans `src/app/page.tsx` au lieu d'un vrai template HTML comme les autres blueprints.
Il manque aussi le blueprint dans `content/blueprints/registry.json`.

## ⛔ NE PAS faire

- Ne pas modifier la logique backend (apply-boutique.ts, actions.ts) — elle fonctionne
- Ne pas créer de nouveaux modules
- Ne pas toucher aux autres blueprints
- Ne pas migrer quoi que ce soit depuis Holia ou un autre SaaS existant

## À faire — 3 étapes

---

### Étape 1 — Ajouter boutique au registry

Fichier : `content/blueprints/registry.json`

Ajouter dans le tableau `"templates"` (après "artisan") :
```json
{ "id": "boutique", "label": "Boutique e-commerce", "dir": "boutique" }
```

---

### Étape 2 — Créer le template vitrine boutique

Créer : `content/blueprints/templates/boutique/index.html`

**Style attendu** : identique aux autres templates (artisan, restaurant, salon…) —
une page HTML standalone avec Tailwind CDN, dark/light toggle, Lucide icons (CDN local `/lucide.min.js`).

**Sections à inclure** :
1. **Hero** — Nom boutique (`{{shop_name}}`), accroche (`{{shop_tagline}}`), bouton "Voir le catalogue" → `/boutique`
2. **Mise en avant** — 3 blocs de catégories ou avantages (livraison, paiement sécurisé, retours)
3. **CTA** — "Créer mon compte" → `/login` + "Mon panier" → `/boutique/panier`
4. **Footer** — Nom boutique, liens légaux

**Variables Mustache** (seront remplacées côté serveur) :
- `{{shop_name}}` — nom de la boutique
- `{{shop_tagline}}` — accroche (ex: "La mode au meilleur prix")
- `{{primary_color}}` — couleur primaire (défaut `#111827`)
- `{{shop_email}}` — email contact

**Tokens Tailwind / style** : utiliser les mêmes conventions que `content/blueprints/templates/artisan/index.html` (dark mode toggle, smooth scroll, responsive).

---

### Étape 3 — Wirer le template dans server.ts et page.tsx

**Dans `src/core/blueprint/server.ts`**, ajouter (sur le modèle des fonctions existantes comme `renderArtisanHomeHtml`) :

```typescript
export async function renderBoutiqueHomeHtml(): Promise<string> {
  const tplPath = join(process.cwd(), "content/blueprints/templates/boutique/index.html");
  let html = readFileSync(tplPath, "utf8");
  // Récupérer les settings boutique depuis DB ou valeurs par défaut
  const db = getDb();
  const rows = await db.select().from(appSettings);
  const get = (k: string, def: string) => rows.find(r => r.key === k)?.value ?? def;
  html = html
    .replace(/\{\{shop_name\}\}/g, get("shop.name", "Ma Boutique"))
    .replace(/\{\{shop_tagline\}\}/g, get("shop.tagline", "Découvrez notre catalogue"))
    .replace(/\{\{primary_color\}\}/g, get("theme.primary", "#111827"))
    .replace(/\{\{shop_email\}\}/g, get("shop.email", "contact@maboutique.fr"));
  return html;
}
```

**Dans `src/app/page.tsx`**, remplacer le bloc `if (blueprint === "boutique")` hardcodé par :

```typescript
if (blueprint === "boutique") {
  const html = await renderBoutiqueHomeHtml();
  return <BlueprintHome html={html} />;
}
```

Et ajouter l'import `renderBoutiqueHomeHtml` dans la liste en haut du fichier.

---

### Étape 4 — Créer blueprint.json boutique

Créer `content/blueprints/boutique/blueprint.json` :
```json
{
  "id": "boutique",
  "label": "Boutique e-commerce",
  "summary": "Catalogue produits, panier, commande, frais de port, paiement Stripe.",
  "business": {
    "needs": [
      { "need": "Catalogue produits", "admin": "Produits, catégories, photos, prix", "modules": ["shop"] },
      { "need": "Panier & commande", "admin": "Commandes, statuts, historique", "modules": ["shop"] },
      { "need": "Paiement en ligne", "admin": "Clés Stripe chiffrées, webhooks", "modules": ["stripe"] },
      { "need": "Frais de port", "admin": "Zones & tarifs livraison", "modules": ["shop"] },
      { "need": "Notifications commandes", "admin": "Emails confirmation, expédition", "modules": ["notifications"] }
    ],
    "modulesOn": ["shop", "stripe", "notes", "notifications"],
    "modulesOff": ["booking", "billing", "artisan-quotes", "lodging", "restaurant", "events", "blog", "gift-cards", "chat", "directory"]
  },
  "frontendTemplate": "boutique"
}
```

## Vérification finale

```bash
# JSON valide
python3 -c "import json; json.load(open('content/blueprints/boutique/blueprint.json')); print('blueprint.json OK')"
python3 -c "import json; r=json.load(open('content/blueprints/registry.json')); print('boutique in registry:', any(t['id']=='boutique' for t in r['templates']))"
# Template existe
ls -la content/blueprints/templates/boutique/index.html
```
