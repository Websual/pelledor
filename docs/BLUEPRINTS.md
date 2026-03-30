# Blueprints — plusieurs MVP métier dans un seul CMS

Chaque blueprint = **template vitrine** + **modules ON/OFF** + **seed** + **menu admin** + **`saas-modules.json`** recommandé.

## Tableau MVP

| Blueprint | Métier | Modules typiques | Spécificité |
|-----------|--------|-------------------|-------------|
| **artisan** | BTP, dépannage | directory, booking, billing, **artisan-quotes**, stripe, notes | **Devis en ligne** → admin → **facture brouillon** ; RDV ; factures |
| **gite** | Gîte, chambres d’hôtes | directory, **lodging**, stripe, notes | **Chambres = produits** ; nuits ; Stripe |
| **hotel** | Hôtel | idem gîte | Vitrine hôtel + seed **3 chambres** ; slug **`mon-hotel`** ; CTA → lodging |
| **restaurant** | Table / service | directory, **restaurant**, stripe, notes | **Tables** (couverts) ; créneaux **90 min** ; résa publique ; notif admin |
| **praticien** | RDV bien-être | directory, booking, billing, chat, stripe, notes | Vitrine + seed `mon-praticien` + 3 séances |
| **cabinet** | Conseil / juridique | idem praticien | Vitrine cabinet + seed `mon-cabinet` |
| **immobilier** | Agence | + **events** (portes ouvertes), chat OFF | Seed `mon-agence` + 6 prestations (visites, estimation…) |
| **salon** | Coiffure / barbier | idem praticien | Seed `mon-salon` + 6 prestations ; `LIEN_RDV` → `/login` |
| **boutique** | E‑commerce | **shop**, stripe, notes | Catalogue, panier, commande, frais de port, paiement Stripe (style WooCommerce) |

## Blueprint e‑commerce (boutique)

- **Module `shop`** : produits, catégories, panier (session ou utilisateur), commandes, **calcul frais de port** (zones + règles), paiement Stripe. Réutilisable par tout blueprint.
- **Blueprint `boutique`** : active le module shop + toggles adaptés (directory/booking optionnel). Pas de template vitrine dédié pour l’instant : la vitrine = catalogue `/boutique` + pages produit / panier / commande.
- **Tables** : `products`, `product_categories`, `product_category_links`, `cart_items`, `orders`, `order_items`, `shipping_zones`, `shipping_rates`.
- **Public** : `/boutique` (catalogue), `/boutique/produit/[slug]`, `/boutique/panier`, `/boutique/commande` (checkout).
- **Admin** : `/admin/shop` — CRUD produits, catégories, liste commandes, paramètres livraison (zones, tarifs).
- **Frais de port** : zones (pays / défaut), règles (fixe, gratuit au‑dessus de X €), calcul au checkout.

## Blueprint hôtel

- Même **module lodging** que le gîte (pas de module séparé).
- Seed : **chambre-classique**, **chambre-superieure**, **suite-vue-mer** — résa : `/hebergement/chambre/[slug]?e=mon-hotel`.
- Vitrine : bouton « Rechercher » devient lien **Réserver en ligne** (`LINK_RESA`).

## Module **lodging** (hébergement)

- **rooms** : une ligne par chambre (slug, prix/nuit, capacité, image, publié).
- **room_bookings** : `check_in` / `check_out` (YYYY-MM-DD), statut `pending` → **Stripe** → `confirmed`.
- **Dispo** : pas de chevauchement sur la même chambre pour les résas pending/confirmed.
- **Public** : `/hebergement/chambre/[slug]?e=SLUG_ETABLISSEMENT` (slug = practitioner).
- **Admin** : `/admin/lodging` — CRUD chambres.
- **Webhook Stripe** : `purpose=room_booking` + `bookingId`.

Migration : `drizzle/0004_rooms_lodging.sql`.

## Appliquer un blueprint

| Action | Effet |
|--------|--------|
| **Artisan** | Bascules + seed profil + prestations + `saas-modules` artisan |
| **Gîte** | Lodging ON + `mon-gite` + 2 chambres |
| **Hôtel** | Idem + `mon-hotel` + **3 chambres** + template hotel + `blueprint.hotel.payload` |
| **Restaurant** | Tables + résa 90 min + `saas-modules` restaurant |
| **Praticien** | Comme ci-dessus + `mon-praticien` |
| **Cabinet** | `mon-cabinet` + template |
| **Immobilier** | `mon-agence` + **events** ON + template immobilier |
| **Salon** | `mon-salon` + template salon |
| **Boutique** | Module **shop** ON + stripe ; catalogue, panier, commande, livraison |

Ensuite : **`pnpm saas:build`** puis **`pnpm build`**.

## Fichiers clés

- `content/blueprints/<id>/saas-modules.json`
- `content/blueprints/templates/<id>/index.html`
- `apply-gite` | **`apply-hotel`** | …
- `content/modules/lodging/` — API + pages réservation

## Module artisan-quotes (devis)

- Table **`quote_requests`** ; migration **`0006_artisan_quotes.sql`**.
- Public : **`/devis?e=SLUG_ENTREPRISE`** (même slug que la fiche seed `mon-entreprise`).
- Vitrine artisan : CTA **« Devis en ligne »** → placeholder **`LINK_DEVIS`** (défaut `/devis?e=mon-entreprise`).
- Admin : **`/admin/devis`** — statuts (nouveau → contacté → devis envoyé…) + **facture brouillon** (montant €) liée à la demande.

## Module restaurant (MVP)

- **restaurant_tables** + **restaurant_reservations** ; migration `0005_restaurant.sql`.
- Public : **`/restauration/reserver?e=mon-restaurant`** (date, heure, couverts).
- Admin : **`/admin/restaurant`** — tables + liste des résas.
- Blueprint **Restaurant** : bouton apply → seed `mon-restaurant` + 4 tables + vitrine template.

## Blueprint praticien

- Admin : **Appliquer blueprint praticien** → bascules + `blueprint.active = praticien` + `saas-modules.json` (booking, billing, chat…).
- Vitrine : `content/blueprints/templates/praticien/index.html` + JSON `blueprint.praticien.payload` (défauts `defaults-praticien.ts`).
- **Suite** : praticien → cabinet → **immobilier** → **salon** (faits).

## Blueprint cabinet

- **Apply** : bascules identiques au praticien + `blueprint.active = cabinet` + `saas-modules.json` dans `content/blueprints/cabinet/`.
- Payload : `blueprint.cabinet.payload` ; défauts `defaults-cabinet.ts` (ex. cabinet d’avocats placeholder).
- Slug annuaire seed : **`mon-cabinet`**.

## Blueprint immobilier & salon

- **Immobilier** : modules booking + billing + directory + **events** + notifications ; pas chat. Seed **`mon-agence`**.
- **Salon** : comme praticien (booking, chat, billing). Seed **`mon-salon`**.

## Fichiers module shop

- `content/modules/shop/` — API (products, categories, cart, orders, shipping/rates, checkout) + routes `boutique/`, `boutique/produit/[slug]`, `boutique/panier`, `boutique/commande`.
- `src/app/admin/shop/` — gestion produits, catégories, commandes, livraison.
- Migration : `drizzle/0007_shop_ecommerce.sql`.

## Évolutions

- Caution Stripe par couvert ; horaires d’ouverture par jour.
- **Hôtel multi-unités** : déjà couvert par **plusieurs lignes `rooms`** (une chambre = un calendrier).
- Devis artisan : module facture en brouillon + lien public (à ajouter).
