# API modules (après `pnpm saas:build`)

Base : **`/api/modules/<module>/...`**

## MVP livre blanc : Notes + Stripe

| Étape | Détail |
|-------|--------|
| 1 | Utilisateur créé à l’install → hook **`user_created`** → module Stripe peut créer un customer (si branché). |
| 2 | **`POST /api/modules/stripe/checkout`** (auth) : paiement lié aux **notes** (`purpose=notes`). |
| 3 | Webhook Stripe : accès note → table **`note_access`** ; pas de couplage Auth → Stripe dans le core. |
| 4 | CRUD notes : routes module **notes** (pages sous `(modules)/notes` après build). |

C’est l’**épreuve du feu** livre blanc : schémas DB cohérents, deps NPM fusionnées, doc lisible par l’IA / le dev.

## Tableau des routes (démo étendue)

| Module | Méthode | Chemin | Auth | Description |
|--------|---------|--------|------|-------------|
| **stripe** | POST | `/stripe/checkout` | oui | Notes payantes |
| **stripe** | POST | `/stripe/webhook` | Stripe | `purpose=notes` → note_access ; `purpose=event_ticket` → tickets |
| notes | — | pages module | — | CRUD selon impl |
| directory | GET/POST | `/directory/practitioners` | … | |
| directory | GET | `/directory/practitioners/[slug]` | non | |
| booking | GET/POST | `/booking/appointments` | oui | |
| booking | PATCH | `/booking/appointments/[id]` | oui | Statuts RDV |
| billing | GET/POST | `/billing/invoices` | … | |
| events | POST | `/events/checkout` | oui | Billets |
| … | | | | (voir code sous `content/modules/`) |

**Webhook** : événement **`ticket_purchased`** émis côté serveur quand un billet est confirmé.

**Hooks** : `user_created`, `appointment_created`, `appointment_status_changed`, `ticket_purchased` — voir **`docs/HOOKS.md`**.

Import optionnel de données : **`docs/IMPORT_PRISMA.md`** (hors parcours standard).
