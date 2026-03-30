# CURSOR — Créer de nouveaux blueprints dans Pelledor CMS

## Contexte

Pelledor est un CMS open source (Next.js 16, Drizzle ORM, PostgreSQL, Auth.js v5, Stripe).
Un **blueprint** = un profil métier préconfiguré qui active/désactive les bons modules et seed une démo.

Ce fichier est ta feuille de route pour créer un nouveau blueprint de A à Z.

---

## Architecture d'un blueprint

```
content/blueprints/[slug]/
  blueprint.json          ← description métier + modules ON/OFF
  saas-modules.json       ← liste des modules actifs (copié dans saas-modules.json à l'install)

src/core/blueprint/
  apply-[slug].ts         ← logique d'activation modules + seed données démo
  defaults-[slug].ts      ← valeurs par défaut (thème, config)

src/core/blueprint/server.ts   ← enregistrement du blueprint (importer ici)
src/app/admin/blueprint/       ← UI de sélection (à mettre à jour)
```

---

## Blueprints déjà créés (ne pas recréer)

- `artisan` — devis, signature, facturation
- `praticien` — RDV, anamnèse, fiche patient, facturation
- `restaurant` — réservations, menu, click & collect
- `gite` — réservations nuits, calendrier, acompte
- `salon` — agenda, prestations, galerie
- `boutique` — catalogue, panier, commandes
- `cabinet` — professionnel libéral générique
- `hotel` — multi-chambres
- `immobilier` — listings biens

---

## Modules disponibles (src/core/modules/catalog.ts)

| ID | Description |
|---|---|
| `notes` | Notes & suivi (patient, client) |
| `stripe` | Paiements Stripe |
| `directory` | Annuaire / profil public |
| `booking` | Agenda & RDV en ligne |
| `billing` | Facturation PDF |
| `anamnese` | Formulaire pré-consultation |
| `notifications` | Rappels email/SMS |
| `chat` | Messagerie |
| `events` | Événements & billetterie |
| `blog` | Blog |
| `gift-cards` | Cartes cadeaux |
| `artisan-quotes` | Devis artisan + signature électronique |
| `lodging` | Hébergement (nuits, calendrier) |
| `restaurant` | Resto (tables, menu, C&C) |
| `click-collect` | Click & collect |

---

## Étapes pour créer le blueprint `[SLUG]`

### Étape 1 — blueprint.json

Créer `content/blueprints/[SLUG]/blueprint.json` :

```json
{
  "id": "[SLUG]",
  "label": "[Label affiché dans l'admin]",
  "summary": "[Description courte du métier]",
  "business": {
    "needs": [
      {
        "need": "[Besoin métier 1]",
        "admin": "[Ce que l'admin configure]",
        "modules": ["[module_id]"]
      }
    ],
    "modulesOn": ["module1", "module2", "stripe", "notifications"],
    "modulesOff": ["les autres modules non utilisés"]
  },
  "frontendTemplate": "[SLUG]"
}
```

### Étape 2 — saas-modules.json

Créer `content/blueprints/[SLUG]/saas-modules.json` :

```json
{
  "modules": ["module1", "module2", "stripe", "notifications"]
}
```

### Étape 3 — defaults-[SLUG].ts

Créer `src/core/blueprint/defaults-[SLUG].ts` :

```typescript
export const DEFAULT_[SLUG]_SETTINGS = {
  businessName: "[Nom démo]",
  businessType: "[SLUG]",
  primaryColor: "#6366F1",
  // Ajouter les paramètres spécifiques au métier
}
```

### Étape 4 — apply-[SLUG].ts

Créer `src/core/blueprint/apply-[SLUG].ts` en suivant le pattern de `apply-praticien.ts` :

```typescript
import { getDb } from "@/core/db/server";
import { appSettings } from "@/core/db/schema";
import { setModuleToggle } from "@/core/theme/db";

const ON = ["module1", "module2", "stripe", "notifications"];
const OFF = [/* tous les autres modules */];

export async function apply[SLUG_PascalCase]Toggles() {
  for (const s of ON) await setModuleToggle(s, true);
  for (const s of OFF) await setModuleToggle(s, false);
}

export async function seed[SLUG_PascalCase](adminUserId: string) {
  const db = getDb();
  
  // 1. Seed des données démo spécifiques au métier
  // (voir apply-praticien.ts pour le pattern complet)
  
  // 2. Enregistrer le blueprint actif
  await db
    .insert(appSettings)
    .values({ key: "blueprint.active", value: "[SLUG]" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "[SLUG]", updatedAt: new Date() },
    });

  // 3. Copier saas-modules.json
  const { readFileSync, writeFileSync } = require("fs");
  const { join } = require("path");
  const j = JSON.parse(readFileSync(join(process.cwd(), "content/blueprints/[SLUG]/saas-modules.json"), "utf8"));
  writeFileSync(join(process.cwd(), "saas-modules.json"), JSON.stringify({ modules: j.modules }, null, 2) + "\n");

  return {
    slug: "[SLUG]-demo",
    message: "Blueprint [SLUG] activé avec données de démonstration.",
  };
}
```

### Étape 5 — Enregistrer dans server.ts

Dans `src/core/blueprint/server.ts`, ajouter :

```typescript
import { apply[SLUG_PascalCase]Toggles, seed[SLUG_PascalCase] } from "./apply-[SLUG]";

// Dans le switch/map d'application des blueprints :
case "[SLUG]":
  await apply[SLUG_PascalCase]Toggles();
  result = await seed[SLUG_PascalCase](adminUserId);
  break;
```

### Étape 6 — Ajouter dans registry.json

Dans `content/blueprints/registry.json`, ajouter dans `"templates"` :

```json
{ "id": "[SLUG]", "label": "[Label]", "dir": "[SLUG]" }
```

### Étape 7 — Vérification build

```bash
npm run build
```

Si erreurs TypeScript → les corriger avant de continuer.

---

## Blueprints à créer (priorité)

### 1. `avocat`
- **Label** : Cabinet d'avocat
- **Modules ON** : `booking`, `billing`, `stripe`, `artisan-quotes`, `chat`, `notifications`, `notes`
- **Modules OFF** : `lodging`, `restaurant`, `click-collect`, `events`, `gift-cards`, `anamnese`
- **Seed** : 1 avocat démo, 3 types de consultations (consultation initiale 150€, rendez-vous suivi 100€, consultation urgente 200€), horaires lun-ven 9h-18h
- **Spécificité** : utiliser `artisan-quotes` pour les devis d'honoraires + signature

### 2. `coach`
- **Label** : Coach & Formateur
- **Modules ON** : `booking`, `billing`, `stripe`, `chat`, `notifications`, `notes`
- **Modules OFF** : `lodging`, `restaurant`, `click-collect`, `events`, `gift-cards`, `anamnese`, `artisan-quotes`
- **Seed** : 1 coach démo, 4 types de séances (coaching individuel 90€, coaching de groupe 45€, bilan 120€, session visio 80€)
- **Spécificité** : abonnements récurrents via Stripe Billing

### 3. `veterinaire`
- **Label** : Cabinet vétérinaire
- **Modules ON** : `booking`, `billing`, `stripe`, `anamnese`, `notifications`, `notes`
- **Modules OFF** : `lodging`, `restaurant`, `click-collect`, `events`, `blog`, `gift-cards`, `artisan-quotes`
- **Seed** : 1 vétérinaire démo, 4 types de consultations (consultation générale 55€, vaccination 45€, urgence 90€, chirurgie sur devis)
- **Spécificité** : adapter l'anamnèse pour les animaux (espèce, race, âge, antécédents)

### 4. `photographe`
- **Label** : Photographe & Studio
- **Modules ON** : `booking`, `billing`, `stripe`, `artisan-quotes`, `notifications`, `blog`
- **Modules OFF** : `lodging`, `restaurant`, `click-collect`, `events`, `gift-cards`, `anamnese`, `chat`, `notes`
- **Seed** : 1 photographe démo, 4 types de séances (portrait 200€, mariage sur devis, reportage entreprise 450€, bébé/famille 180€)

### 5. `auto-ecole`
- **Label** : Auto-école
- **Modules ON** : `booking`, `billing`, `stripe`, `notifications`, `notes`
- **Modules OFF** : `lodging`, `restaurant`, `click-collect`, `events`, `blog`, `gift-cards`, `artisan-quotes`, `anamnese`, `chat`
- **Seed** : 1 auto-école démo, 3 forfaits (forfait 20h : 1200€, forfait 30h : 1600€, heure supplémentaire : 65€)

### 6. `traiteur`
- **Label** : Traiteur & Événementiel
- **Modules ON** : `artisan-quotes`, `billing`, `stripe`, `notifications`, `events`, `blog`
- **Modules OFF** : `booking`, `lodging`, `restaurant`, `click-collect`, `gift-cards`, `anamnese`, `chat`, `notes`
- **Seed** : 1 traiteur démo, 4 formules (cocktail dînatoire, brunch 35€/pers, buffet froid 28€/pers, menu gastronomique sur devis)

---

## Pattern de seed recommandé

Regarde `apply-praticien.ts` pour le pattern complet. Points clés :
1. Vérifier si données existent déjà avant d'insérer (éviter les doublons)
2. Utiliser `.returning({ id: table.id })` pour récupérer les IDs
3. Toujours appeler `setModuleToggle` pour activer/désactiver les modules
4. Toujours enregistrer `blueprint.active` dans `appSettings`
5. Toujours copier `saas-modules.json`

---

## Commandes utiles

```bash
# Build
npm run build

# Test en dev
npm run dev

# Appliquer un blueprint via l'API admin
curl -X POST http://localhost:3350/api/admin/blueprint/apply \
  -H "Content-Type: application/json" \
  -d '{"blueprint": "avocat"}'

# Vérifier les modules actifs
curl http://localhost:3350/api/modules
```

---

## Notes importantes

- Ne jamais modifier les fichiers `.env.local` — ils contiennent les vraies credentials
- Le port de dev est `3350` (voir `ecosystem.config.cjs`)
- DB : PostgreSQL, credentials dans `.env.local`
- Après chaque blueprint : `git add -A && git commit -m "feat: blueprint [slug]" && git push`
