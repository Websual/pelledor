# Vision Produit — SaaS OS

## Le concept clé

**"Vendeur de pelles à la ruée du SaaS"**

Tout le monde se bat pour créer des SaaS. SaaS OS vend l'infrastructure qui permet de les créer — et plus encore : il livre le SaaS clé en main au client final.

## La différenciation absolue : Site vitrine + Back-office = Un seul outil

Ce qui n'existe pas aujourd'hui :
- **Wix/Squarespace** → fait le site, s'arrête là
- **Henrri/Freebe/Zoho** → fait la gestion, s'arrête là
- **SaaS OS** → fait les deux, liés, sous la même charte graphique

### Exemple concret : Blueprint "Artisan"

Un plombier arrive sur SaaS OS. Il choisit le Blueprint "Artisan". Il reçoit :

1. **Son site vitrine** (frontend) — adapté de nos templates de démo existants :
   - Page d'accueil avec ses services, sa zone d'intervention, ses photos
   - Formulaire de contact / demande de devis
   - Galerie de réalisations
   - Avis clients

2. **Son back-office** (logique métier) :
   - Création de devis en 2 clics
   - Transformation devis → facture
   - Suivi des paiements
   - Agenda / planning des interventions
   - Base clients

3. **Le lien magique** :
   - Bouton "Demander un devis" sur le site → crée un devis dans le back-office
   - Devis envoyé → le client le signe en ligne depuis le site
   - Paiement acompte → intégré
   
## Blueprints prévus (par ordre de priorité)

### 1. Artisan (premier Blueprint)
- **Cibles** : plombier, électricien, menuisier, carreleur, peintre
- **Modules** : Site vitrine + Devis/Factures + Planning + Paiements
- **Prix cible** : 49€/mois ou 590€ one-time
- **Positionnement** : métier terrain / artisanat, pas la même cible qu’un vertical « rendez-vous bien-être ».

### 2. Thérapeute / Praticien (futur Blueprint)
- Après stabilisation du blueprint Artisan

### 3. Restaurant (futur Blueprint)
- Menu en ligne + réservation + commande click & collect

### 4. Agence / Freelance (futur Blueprint)  
- Portfolio + Propositions commerciales + Suivi projets + Facturation

## Canal d'acquisition naturel

La prospection Websual devient le canal d'acquisition SaaS OS :

1. On envoie une démo personnalisée à un artisan (pipeline actuel)
2. La démo = la preview de son futur site vitrine SaaS OS
3. Email de suivi : "Cette démo peut devenir votre vrai site, avec en bonus le back-office de gestion"
4. Conversion directe

**Le tunnel est déjà construit.** 411+ emails envoyés = 411 démos = 411 prospects pour SaaS OS.

## Assets déjà disponibles

### Templates frontend (dans `/root/.openclaw/workspace/websual-prospection/demo-templates/`)
- `artisan/` → template artisan validé ✅
- `restaurant/` → template restaurant validé ✅
- `salon/` → template salon ✅
- `cabinet/` → template cabinet (avocat, archi, comptable) ✅
- `hotel/` → template hôtel ✅
- `viticole/` → template domaine viticole ✅
- `praticien/` → template praticien bien-être ✅
- 5 autres templates...

### Modules back-office (à modulariser dans SaaS OS)
- Auth (sessions, RBAC)
- Calendrier / Planning
- Messagerie
- Stripe (paiements)
- Facturation
- Profils / CRM

Implémentation cible : **hooks + schémas Drizzle injectables** (comme les modules déjà dans `content/modules/`).

## Stack technique (validée)

- **Framework** : Next.js 15 (App Router)
- **DB** : PostgreSQL + Drizzle ORM (fusion de schémas par modules)
- **UI** : Tailwind CSS + Radix/Shadcn (headless, 100% themeable)
- **Auth** : NextAuth / Auth.js
- **Paiement** : Stripe
- **Package manager** : pnpm

## Architecture à retenir pour le frontend Blueprint

Le frontend (site vitrine) est un **module SaaS OS** comme les autres :
- Il a son propre `schema.ts` (table `site_settings`, `gallery_items`, `testimonials`...)
- Il est configurable depuis le back-office admin (couleurs, textes, photos)
- Il utilise les tokens du design system SaaS OS (headless UI)
- Au build, ses routes sont injectées dans `/app/(site)/`

Le back-office est accessible sur `/admin/` (sous-chemin ou sous-domaine).

## MVP Scope (Étape 4 du plan Cursor)

Pour valider l'épreuve du feu du livre blanc + notre vision :

1. Core + Auth + EventBus
2. Module "Site vitrine Artisan" (frontend template → données dynamiques depuis DB)
3. Module "Devis/Factures" (logique métier artisan)
4. Module "Stripe" (paiement acompte devis)
5. Thème : tokens couleurs extraits automatiquement depuis le logo (comme notre pipeline prospection)
6. Admin : activer/désactiver modules, éditer tokens, preview live

La démo finale = un plombier qui configure son site + son back-office en 10 minutes.
