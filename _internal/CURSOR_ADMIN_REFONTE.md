# CURSOR — Refonte complète du dashboard admin Pelledor

## Contexte

Le dashboard actuel (`/admin`) est fonctionnel mais conçu pour des développeurs.
L'objectif est de le transformer en une interface **accessible à tout professionnel non-tech** :
artisan, praticien, restaurateur, etc.

**Référence visuelle** : captures dans `_internal/stitch-mockup-*.jpg` (dashboard + builder + nav)
**Stack** : Next.js 16, TypeScript, Tailwind CSS, lucide-react, shadcn/ui
**Règle absolue** : aucune terminologie technique visible (pas de "tokens", "npm", "JSON", "API", "blueprint" tel quel)

---

## 1. Nouvelle architecture de navigation (Sidebar)

### Structure du menu (remplace l'actuel)

```
[Logo Pelledor] [Nom du métier / plan]

● Tableau de bord          ← /admin

── MON ACTIVITÉ ──
📅 Planning & RDV          ← /admin/rdv
📄 Devis & Factures        ← /admin/devis  (regroupe devis + factures)
👥 Clients                 ← /admin/clients (nouveau — regroupe profils praticiens)

── MON SITE WEB ──
🌍 Éditeur de pages        ← /admin/builder
🎨 Apparence               ← /admin/appearance (renomme "Tokens live")
📝 Blog & Portfolio        ← /admin/cms  (regroupe blog + portfolio)

── CONFIGURATION ──
⚙️  Réglages               ← /admin/settings (regroupe infos, Stripe, SMTP, notifs)
🧩 Fonctionnalités         ← /admin/modules (renomme modules + blueprints)

── BAS DE SIDEBAR ──
[Avatar] Prénom
[→] Déconnexion
```

### Fichiers à modifier
- `src/core/blueprint/admin-menu.ts` — source de vérité du menu, TOUTES les entrées passent par ici
- `src/app/admin/layout.tsx` — rendu de la sidebar

### Règles sidebar
- Sections groupées avec label uppercase discret (MON ACTIVITÉ / MON SITE WEB / CONFIGURATION)
- Item actif : fond bleu indigo #6366F1 + texte blanc, bord gauche 3px indigo
- Items inactifs : texte neutral-700, hover fond neutral-100
- Logo en haut : "P" arrondi indigo + "Pelledor" + subtitle = nom du métier actif (ex: "Plan Artisan")
- Mobile : sidebar rétractable (hamburger)
- Masquer automatiquement les items dont le module est désactivé (ex: si module restaurant OFF → masquer "Restaurant")

---

## 2. Tableau de bord (/admin)

### Layout
Inspiré de la maquette Stitch capture 1.

```
Header : "Bonjour [Prénom], voici l'état de votre activité"
Subtitle : "Vous avez X rendez-vous prévus aujourd'hui."
CTA button top-right : [+ Créer un devis] (ou action principale du blueprint)

── LIGNE STATS (3 cartes) ──
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 📅 RDV à venir  │  │ 📄 Devis en att │  │ 🌐 Visites site │
│      3          │  │      2          │  │     342         │
│ Prochain 14h00  │  │ 1 450 €         │  │ +13% ce mois    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

── LIGNE PRINCIPALE ──
┌──────────────────────────────┐  ┌──────────────────┐
│ Dernières demandes           │  │ Accès rapides    │
│ (tableau clients/devis récents) │  │ (3-4 actions)  │
│                              │  │                  │
└──────────────────────────────┘  └──────────────────┘

── BAS ──
Bloc "Besoin d'aide ?" (bleu indigo) avec lien support
```

### Données réelles à brancher
- RDV : count depuis table `appointments` WHERE date > now()
- Devis en attente : count depuis table `invoices` / `quote_requests` WHERE status = pending
- Prochains RDV : query avec date proche
- Dernières demandes : join appointments + users (5 derniers)

### Fichier
`src/app/admin/page.tsx` — refaire entièrement ce composant

---

## 3. Page Builder (/admin/builder) — Refonte UX

### Layout 3 colonnes (plein écran, sans la sidebar admin)
Inspiré de la maquette Stitch capture 2.

```
┌─────────────────────────────────────────────────────────────────┐
│ [◀ Pelledor Editor]  [Desktop|Tablet|Mobile]  [👁][⚙][↩] [Sauvegarder] [Publier] │
├──────────────────┬────────────────────┬──────────────────────────┤
│  PANNEAU GAUCHE  │  INSPECTEUR        │  PRÉVISUALISATION        │
│  (180px)         │  (320px)           │  (flex-1)                │
│                  │                    │                          │
│  • Components    │  Réglages du bloc  │  Rendu SSR de la page    │
│  • Layers        │  sélectionné       │  en iframe ou composants │
│  • Assets        │                    │                          │
│  • Themes        │  Si rien sélect:   │  [PC | Tablette | Mobile]│
│  • Global Styles │  réglages page     │                          │
│                  │  (SEO, meta, OG)   │                          │
└──────────────────┴────────────────────┴──────────────────────────┘
```

#### Panneau gauche — onglets

**Onglet "Components"** (bibliothèque de blocs)
- Groupes : CONTENU / CONVERSION / MODULES
- Blocs disponibles avec icônes (voir liste section 4)
- Onglet "Sections (patterns)" : patterns prêts à insérer

**Onglet "Layers"** (arbre de la page)
- Arborescence : Section > Colonnes > Blocs
- Drag & drop pour réordonner
- Boutons : dupliquer / supprimer par item
- Chaque section affiche son type de grille (ex: "12/12", "6/6")

**Onglet "Assets"** (bibliothèque médias — NOUVEAU)
- Upload d'images (drag & drop ou bouton)
- Grille des images uploadées avec miniature
- Champ alt text éditable
- Bouton "Utiliser" pour injecter l'URL dans un bloc image
- Backend : table `media_assets` (id, url, alt, created_at, practitioner_id)
- Stockage : `/public/uploads/[practitioner_id]/[filename]` ou S3 si configuré

**Onglet "Themes"**
- Lien vers /admin/appearance
- Ou mini-aperçu des couleurs du thème actif

#### Inspecteur (colonne centrale)

Quand un **bloc** est sélectionné → affiche ses champs éditables :
- Chaque type de bloc a son propre formulaire (voir section 4)
- Champs : texte, textarea, image picker (ouvre Assets), URL, select, toggle

Quand **rien n'est sélectionné** → affiche les réglages de la page :
- Titre meta (SEO)
- Meta description
- URL canonique (optionnel)
- Open Graph title / description / image
- Mot-clé cible
- Toggle noindex
- Suggestions SEO (H1 présent ?, longueur description, etc.)

#### Prévisualisation (colonne droite)
- Rendu live des blocs (composants React, pas iframe)
- Responsive : toggle Desktop / Tablet (768px) / Mobile (375px)
- Bloc sélectionné : outline bleu + label du type en haut
- Click sur un bloc dans la preview → le sélectionne dans l'inspecteur

---

## 4. Formulaires des blocs (inspecteur)

Chaque type de bloc doit avoir ses champs dans l'inspecteur.
**Actuellement : les blocs s'ajoutent mais restent vides ("Titre de section"). C'est le bug principal à corriger.**

### `hero` — Bloc Hero / Bannière
- `title` : texte (H1 de la page)
- `subtitle` : textarea
- `backgroundImage` : image picker (ouvre Assets)
- `backgroundOverlay` : opacity slider 0-100%
- `ctaPrimary` : { label: text, url: text }
- `ctaSecondary` : { label: text, url: text } (optionnel)
- `textAlign` : select (left / center / right)
- `minHeight` : select (small / medium / large / full)

### `heading` — Titre (SEO)
- `text` : texte
- `level` : select (H1 / H2 / H3 / H4)
- `align` : select (left / center / right)
- `size` : select (sm / md / lg / xl)

### `text` — Texte riche
- `content` : rich text editor (simple — gras, italique, listes, liens)

### `image` — Image
- `src` : image picker (ouvre Assets)
- `alt` : texte
- `caption` : texte (optionnel)
- `aspectRatio` : select (auto / 16:9 / 4:3 / 1:1)
- `rounded` : toggle

### `gallery` — Galerie d'images
- `images` : liste de { src, alt } — ajouter/supprimer via Assets
- `columns` : select (2 / 3 / 4)
- `gap` : select (sm / md / lg)

### `cta` — Bouton d'action
- `label` : texte
- `url` : texte
- `variant` : select (primary / secondary / outline)
- `size` : select (sm / md / lg)
- `align` : select (left / center / right)
- `icon` : select (none / arrow / external) 

### `services` — Grille de services
- `title` : texte (optionnel)
- `items` : liste de { icon: select lucide, title, description, price? }
- `columns` : select (2 / 3 / 4)

### `faq` — FAQ / Accordéon
- `title` : texte (optionnel)
- `items` : liste de { question, answer }

### `testimonials` — Témoignages
- `title` : texte (optionnel)
- `items` : liste de { name, role, text, avatar? }
- `layout` : select (grid / carousel)

### `separator` — Séparateur
- `style` : select (line / space / dots)
- `height` : select (sm / md / lg)

### `contact-info` — Coordonnées
- `address` : texte
- `phone` : texte
- `email` : texte
- `hours` : textarea
- `showMap` : toggle (intègre un lien Google Maps)

### `embed` — Vidéo / Carte
- `type` : select (youtube / vimeo / google-maps / custom)
- `url` : texte (URL ou embed URL)
- `aspectRatio` : select (16:9 / 4:3 / 1:1)

---

## 5. Page Apparence (/admin/appearance)

**Renommer** "Tokens live" → "Apparence"

### Sections
1. **Couleurs** — palette principale (primary, secondary, accent, background, text)
   - Color pickers visuels (pas de champs hex bruts)
   - Présets de palettes (4-5 palettes prédéfinies cliquables)

2. **Typographie** — 
   - Police principale : select avec aperçu (Google Fonts top 20)
   - Police titres : select idem
   - Taille de base : slider

3. **Boutons & formes** —
   - Rayon des bords : slider (0px → 999px)
   - Style bouton primaire : présets visuels

4. **Espacement** — 
   - Densité : compact / normal / aéré

### Sauvegarde
- Bouton "Enregistrer" → PATCH /api/admin/theme
- Aperçu live dans un mini-preview (hero fictif qui change en temps réel)

---

## 6. Page Réglages (/admin/settings)

Regrouper en onglets ce qui est actuellement dispersé :

**Onglet "Mon entreprise"**
- Nom, description, adresse, téléphone, email, site web
- Logo (upload via bibliothèque médias)
- Réseaux sociaux

**Onglet "Paiements"**
- Clé Stripe (champ masqué + test de connexion)
- Webhook Stripe (auto-généré ou manuel)
- Activer/désactiver les paiements en ligne

**Onglet "Emails & Notifications"**
- SMTP config ou Resend API key
- Templates de notification (texte des emails auto)
- Toggle notifications par événement

**Onglet "Avancé"**
- Nom de domaine personnalisé
- Export des données (CSV)
- Réinitialiser / changer de blueprint (avec avertissement)

---

## 7. Page Fonctionnalités (/admin/modules)

**Renommer** "Modules" → "Fonctionnalités"

### Layout
- Grille de cards (comme l'App Store)
- Chaque module = card avec : icône, nom marketing, description courte, toggle ON/OFF
- Modules groupés par catégorie : VITRINE / ACTIVITÉ / COMMERCE / COMMUNICATION

### Noms marketing des modules
| ID technique | Nom affiché |
|---|---|
| booking | Prise de RDV en ligne |
| billing | Facturation |
| stripe | Paiements en ligne |
| notes | Suivi client / Notes |
| directory | Profil & Annuaire |
| artisan-quotes | Devis & Signature |
| restaurant | Gestion restaurant |
| lodging | Hébergement |
| click-collect | Click & Collect |
| anamnese | Formulaire pré-consultation |
| notifications | Rappels automatiques |
| chat | Messagerie |
| events | Événements & Billets |
| blog | Blog |
| gift-cards | Cartes cadeaux |

### Blueprint
- Section séparée en bas : "Votre métier actuel" 
- Bouton "Changer de métier" → modal avec liste des blueprints disponibles
- Description de chaque blueprint en langage humain (pas de jargon)

---

## 8. Bibliothèque de médias (nouveau module)

### Table SQL à créer
```sql
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES practitioners(id),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER,
  alt TEXT DEFAULT '',
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### API
- `GET /api/admin/media` — liste des médias du praticien
- `POST /api/admin/media` — upload (multipart/form-data)
- `PATCH /api/admin/media/[id]` — modifier alt text
- `DELETE /api/admin/media/[id]` — supprimer

### Stockage
- Dossier `/public/uploads/[practitioner_id]/`
- Limites : 10MB par fichier, formats acceptés : jpg/png/webp/gif/svg
- Redimensionnement automatique si > 2000px (sharp)

### UI dans le builder
- Picker modal : grille 4 colonnes, recherche, click pour sélectionner
- Upload drag & drop intégré dans le picker

---

## 9. Règles générales de style

- **Palette** : fond général `#F9FAFB` (gris très clair), cards blanches, bordures `#E5E7EB`
- **Sidebar** : fond blanc, items indigo au hover/actif
- **Boutons primaires** : indigo #6366F1, texte blanc
- **Boutons secondaires** : bordure neutral-300, fond blanc
- **Typographie** : Inter (déjà en place), titres font-semibold
- **Cards** : rounded-xl, shadow-sm, border border-neutral-200
- **Icônes** : lucide-react TOUJOURS, jamais d'emojis dans l'UI
- **États vides** : illustration simple + texte encourageant (pas de message d'erreur)
- **Responsive** : sidebar mobile rétractable, grilles adaptatives

---

## 10. Ordre de priorité pour Cursor

1. **Sidebar refonte** (`admin-menu.ts` + `layout.tsx`) — débloque tout le reste
2. **Dashboard** (`/admin/page.tsx`) — première impression
3. **Inspecteur des blocs** (`/admin/builder`) — bug actuel blocs vides
4. **Bibliothèque de médias** — prérequis pour les images dans les blocs
5. **Page Apparence** — UX actuelle confuse
6. **Page Réglages** — regroupement
7. **Page Fonctionnalités** — renommage + grille

---

## Instructions pour Cursor

1. Lire ce fichier entièrement avant de commencer
2. Commencer par la Sidebar (point 1) — c'est le fondement
3. Chaque page modifiée doit :
   - Compiler sans erreur TypeScript (`npm run build`)
   - Conserver les routes existantes (pas de breaking change)
   - Garder la logique métier intacte (seul le rendu change)
4. Ne pas renommer les routes `/admin/*` existantes
5. Ajouter les nouvelles routes si nécessaire
6. Commits atomiques par fonctionnalité
7. Après chaque grosse section : `npm run build && pm2 restart pelledor`

---

## Ce qui reste inchangé (ne pas toucher)

- Toute la logique métier (appointments, invoices, billing, etc.)
- Les routes API `/api/*`
- Le système d'auth (Auth.js)
- Les migrations SQL
- Le système de blueprints (logique interne)
- Le wizard `/install`
