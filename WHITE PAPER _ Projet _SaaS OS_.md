# **WHITE PAPER : Projet "SaaS OS"**

**Le premier framework modulaire pour applications Web stateful à l'ère de l'IA.**

## **1\. Le Constat (Executive Summary)**

Aujourd'hui, créer un site vitrine prend quelques minutes grâce à des CMS comme WordPress ou des générateurs IA. Mais créer un SaaS (Software as a Service) complet, sécurisé et scalable nécessite toujours des mois de développement.  
Les "boilerplates" actuels offrent un point de départ, mais deviennent rigides dès que la logique métier se complexifie.  
**Le besoin :** Il manque au marché du SaaS ce que WordPress a été au marché du contenu : un système d'exploitation modulaire ("SaaS OS"), extensible par plugins, dont le design est régi par des thèmes, et qui orchestre l'assemblage pour que l'IA (ou le développeur) n'ait plus qu'à écrire la logique métier finale.

## **2\. Le Concept Fondamental : L'Architecture Pluggable**

"SaaS OS" repose sur une séparation stricte entre :

1. **Le Core :** Le socle immuable (Authentification, Routing, Sécurité, Gestion des erreurs).  
2. **Les Modules :** Des briques fonctionnelles indépendantes (Stripe, Calendrier, Chat, ToDo).  
3. **Le Thème :** Une surcouche purement visuelle (Headless UI).  
4. **La Logique Métier :** Le liant spécifique à l'utilisateur, généré par l'humain ou l'IA.

## **3\. La Stack Technique (Recommandation pour le MVP)**

Pour garantir la sécurité, la performance et l'évolutivité, la stack doit être moderne et fortement typée :

* **Langage :** TypeScript (Non-négociable pour assurer la compatibilité entre les modules).  
* **Framework :** Next.js (App Router) pour la gestion unifiée du frontend et du backend (Server Actions / API Routes).  
* **Base de données :** PostgreSQL.  
* **ORM :** Drizzle ORM. *(Pourquoi Drizzle plutôt que Prisma ? Car Drizzle permet de définir des schémas dans des fichiers séparés en TypeScript natif. Il est beaucoup plus facile de fusionner des schémas Drizzle lors de l'injection d'un module).*  
* **UI & Thèmes :** Tailwind CSS \+ Radix UI (ou Shadcn UI) pour des composants accessibles et 100% "Headless" (sans style imposé).  
* **Package Manager :** pnpm ou bun (pour la rapidité d'installation et la gestion stricte des dépendances).

## **4\. L'Enfer des Bases de Données : La Solution de l'Injection**

Un SaaS gère des données relationnelles. Comment faire cohabiter des modules indépendants ?

* **Isolation :** Chaque module possède son propre schéma de base de données (ex: schema.calendar.ts).  
* **Graphe de Dépendances :** Lors de l'installation, le CLI lit les pré-requis. Si le module Facturation nécessite Utilisateurs et Calendrier, le système s'assure qu'ils sont installés.  
* **Tables de liaison (Join Tables) :** C'est ici que l'Agent IA (ou un script de configuration) intervient. Il lit le contexte global et crée les relations inter-modules de manière autonome pour relier, par exemple, une table Appointments à une table Invoices.

## **5\. La Gestion des Dépendances (Sécurité NPM)**

C'est le défi de la stabilité. Si un module importe une faille de sécurité, tout le SaaS est compromis.

* **Fichier de manifeste :** Chaque module ne modifie pas le package.json global. Il possède un fichier module.json déclarant ses besoins NPM.  
* **Résolution centrale :** Au moment du *build* par le CLI interactif, le système fusionne tous les module.json, résout les conflits de versions en forçant la version la plus récente et sécurisée, et génère un unique package.json propre.  
* **Audit automatisé :** Le CLI lance un npm audit de manière invisible. S'il y a une faille critique dans un module, l'installation est bloquée avec un message d'erreur clair.

## **6\. L'UI Headless : Séparer la fonction de la forme**

Les modules ne contiennent **aucun code CSS codé en dur**.

* Ils renvoient une structure fonctionnelle avec des classes sémantiques.  
* Un dossier /theme central contient un fichier de configuration Tailwind et les composants de base (Boutons, Inputs, Modales).  
* L'utilisateur peut passer d'un thème "Minimaliste" à un thème "Ludique" en remplaçant un seul dossier, modifiant l'aspect de tous les modules instantanément.

## **7\. La Roadmap du MVP (Le Proof of Concept)**

Pour valider cette architecture titanesque, le MVP doit être minimaliste :

1. **Le CLI de base (npx create-saas-os)** : Capable de copier des dossiers dynamiquement.  
2. **Le Core** : Un système d'Auth simple (ex: NextAuth / Auth.js) \+ un dashboard vide.  
3. **Module A** : "Notes" (CRUD basique de prise de notes).  
4. **Module B** : "Stripe" (Rend la création de Notes payante).  
5. **L'épreuve du feu** : Générer le projet avec les 2 modules, s'assurer que les schémas DB fusionnent via Drizzle, que les packages NPM s'installent sans conflit, et que l'IA arrive à lire la doc générée pour créer le lien entre le paiement et la création de notes.

## 8\.**L'Architecture "SaaS OS" (Inspirée de WP)**

/saas\-os\-project  
│  
├── 📁 /core                 (L'équivalent de wp-includes : INTOUCHABLE)  
│   ├── /db                  (Connexion Drizzle/Prisma, utilitaires DB)  
│   ├── /events              (Le système de Hooks : l'équivalent de add\_action / add\_filter)  
│   ├── /lib                 (Fonctions utilitaires globales : fetcher, logger)  
│   └── /security            (Fonctions de cryptographie, rate\-limiting)  
│  
├── 📁 /admin                (L'équivalent de wp-admin : BACK-OFFICE SUPER ADMIN)  
│   └── /routes              (Interface pour activer/désactiver tes modules SaaS, voir les logs)  
│  
├── 📁 /content              (L'équivalent de wp\-content : LE CODE MÉTIER ET VISUEL)  
│   │  
│   ├── 📁 /themes           (L'UI globale)  
│   │   └── 📁 /mon-theme-saas  
│   │       ├── /components  (Tes composants Headless : UI générique type boutons, modales)  
│   │       ├── /layouts     (Structure des pages : Sidebar, Topbar, Footer)  
│   │       ├── globals.css  (Variables CSS)  
│   │       └── tailwind.config.ts (Le design system dicté par le thème)  
│   │  
│   ├── 📁 /modules          (L'équivalent de wp\-content/plugins)  
│   │   ├── 📁 /auth  
│   │   │   ├── /routes      (Pages injectées : /signin, /signup, /forgot\-password)  
│   │   │   ├── /api         (Endpoints : /api/auth/callback)  
│   │   │   ├── schema.ts    (Table \`users\`, \`sessions\` pour la DB)  
│   │   │   └── module.json  (Dépendances NPM requises : ex. \`next\-auth\`)  
│   │   │  
│   │   └── 📁 /stripe  
│   │       ├── /routes      (Pages injectées : /billing, /pricing)  
│   │       ├── /api         (Endpoints : /api/stripe/webhook)  
│   │       ├── schema.ts    (Table \`subscriptions\`, \`invoices\`)  
│   │       └── module.json  (Dépendances NPM : \`stripe\`)  
│   │  
│   └── 📁 /uploads          (Fichiers statiques, images utilisateurs, géré via S3/AWS ou local)  
│  
├── 📁 /app                  (⚠️ LE DOSSIER NEXT.JS COMPILÉ / AUTO\-GÉNÉRÉ)  
│   ├── (admin)              \-\> Symlink ou copie de /admin/routes  
│   ├── (modules)            \-\> Symlink ou copie des /modules/\*/routes  
│   ├── api                  \-\> Symlink ou copie des /modules/\*/api  
│   ├── page.tsx             (La landing page de ton SaaS)  
│   └── layout.tsx           (Le wrapper global qui appelle le Thème)  
│  
├── middleware.ts            (Le chef d'orchestre des routes)  
├── package.json             (Généré dynamiquement par ton CLI)

└── .env                     (Avec les variables injectées par les modules)

##  9\. Concepts critiques

#### **1\. Le "Middleware" (Le péage de l'autoroute)**

En Next.js, le fichier middleware.ts à la racine intercepte toutes les requêtes avant même qu'elles n'atteignent les pages (pour vérifier si l'utilisateur est connecté, s'il a payé, etc.).

* **Le problème :** Si tu as un module "Auth" et un module "Stripe", les deux veulent modifier le middleware (l'un pour bloquer les non-connectés, l'autre pour bloquer ceux qui n'ont pas payé l'abonnement). Mais Next.js n'autorise qu'**un seul** fichier middleware.ts.  
* **La solution SaaS OS :** Ton /core doit fournir un "Middleware Manager". Chaque module enregistre sa condition (module.auth.middlewareRules, module.stripe.middlewareRules), et le middleware.ts global boucle sur toutes ces règles.

#### **2\. Le système de Hooks (Événements)**

C'est la plus grande force de WordPress : add\_action et apply\_filters. Si tu n'as pas ça, tes modules ne pourront pas se parler sans créer de conflits.

* *Exemple :* Quand un utilisateur s'inscrit (Module Auth), le Module Stripe doit lui créer un customer\_id sur Stripe. Mais le Module Auth ne doit pas avoir de code Stripe en dur, sinon il n'est plus indépendant \!  
* **La solution :** Un "Event Bus" dans le Core.  
  * Module Auth fait : EventBus.emit('user.created', user.id)  
  * Module Stripe fait : EventBus.on('user.created', createStripeCustomer)

#### **3\. L'Internationalisation (i18n / Traductions)**

Un SaaS doit souvent être multilingue très vite. Où mets-tu les fichiers de traduction ?  
Si tu les mets dans le thème, ça veut dire que le thème doit connaître le vocabulaire du module "Calendrier" et du module "Stripe". C'est une mauvaise séparation des responsabilités.

* **La solution :** Chaque module doit avoir un dossier /locales (ex: /modules/auth/locales/fr.json). Lors du build, ton CLI fusionne tous les fr.json des modules avec le fr.json du thème.

### **🛠️ Comment ça marcherait concrètement pour le dev ?**

1. Tu lances la commande : npm run saas:build.  
2. Ton script CLI lit les dossiers dans /content/modules.  
3. Il copie les routes des modules (ex: /content/modules/auth/routes) et les injecte dans le dossier natif de Next.js /app/(modules)/auth.  
4. Il concatène les schema.ts de chaque module dans le dossier de la base de données.  
5. Il lance drizzle-kit push pour mettre à jour la base de données de PostgreSQL.

## 10\. Onboard process

### **1\. L'installation à la WordPress (Le Paradigm Shift)**

En 2005 avec PHP, tu glissais des fichiers sur un serveur FTP (FileZilla), tu allais sur ton-site.com/install.php, et ça marchait.  
En 2026 avec Next.js/Node, une application doit être *buildée* (compilée) et le système de fichiers est souvent en lecture seule (sur Vercel ou Railway par exemple).

**La solution "SaaS OS" pour l'Artisan : Le "1-Click Deploy \+ Setup Mode"**

1. **Le bouton magique :** L'artisan va sur ton site saas-os.com et clique sur "Déployer mon SaaS". Ça le renvoie vers un hébergeur gratuit/pas cher (Vercel, Railway, Coolify) qui clone le code et lance le serveur.  
2. **Le Setup Mode (L'écran d'installation) :**  
   * Au premier lancement, ton middleware.ts détecte qu'il n'y a pas de base de données configurée.  
   * Il redirige automatiquement tout le site vers ton-site.com/install.  
   * L'artisan voit une interface magnifique (UI parfaite). On lui demande : *"Collez ici l'URL de votre base de données (ex: Neon, Supabase, ou locale)"* et *"Créez votre compte Administrateur"*.  
3. **La magie sous le capot (Server Actions) :**  
   * Quand il clique sur "Installer", ton code Next.js se connecte à la DB.  
   * Il lance les migrations Drizzle **programmatiquement** (création des tables).  
   * Il insère le compte Admin.  
   * Il sauvegarde un flag is\_installed: true dans la base.  
   * *Tadaa \!* Redirection vers /admin. Le SaaS est en ligne.

---

### **2\. Le Système de Hooks (Le cœur du réacteur)**

Maintenant, comment les modules communiquent-ils sans se connaître ? Exactement comme WordPress, avec deux concepts majeurs : **Les Actions** et **Les Filtres**.  
Mais puisqu'on est en TypeScript, on va faire ça de manière moderne, sécurisée et asynchrone (parce que les appels aux bases de données prennent du temps).

Voici la proposition d'architecture pour ton "Event Bus".

#### **A. Les Filtres (applyFilters / addFilter)**

Un filtre permet à un module de **modifier une donnée** avant qu'elle ne soit affichée ou sauvegardée.

* **Le scénario :** Le Core veut afficher le menu de la Sidebar.  
* **Le Core fait :** "Hé, voici la liste des liens de base. Est-ce qu'un module veut en rajouter ?"  
* **Le Module Stripe répond :** "Oui, rajoute le lien 'Facturation' à la fin."

**Le code TypeScript (Très simple à utiliser) :**

codeTypeScript

// 1\. Le Core prépare la donnée  
let menuLinks \=\[ { title: "Dashboard", url: "/admin" } \];

// 2\. Le Core passe la donnée dans le "tuyau" des filtres  
menuLinks \= await Hooks.applyFilters('admin\_sidebar\_menu', menuLinks);

// 3\. Dans le dossier /modules/stripe/index.ts  
Hooks.addFilter('admin\_sidebar\_menu', async (links) \=\> {  
    return \[...links, { title: "Facturation", url: "/admin/billing" }\];

});

#### **B. Les Actions (doAction / addAction)**

Une action permet de dire aux autres modules : **"Un événement vient de se passer, faites ce que vous voulez avec."**

* **Le scénario :** Un utilisateur vient de s'inscrire via le module Auth.  
* **Le module Auth fait :** "Alerte générale, un nouvel utilisateur (ID: 45\) vient d'être créé \!"  
* **Le module Email répond :** "Super, je lui envoie l'email de bienvenue."  
* **Le module Stripe répond :** "Parfait, je lui crée un profil client chez Stripe."

**Le code TypeScript :**

codeTypeScript

// 1\. Dans /modules/auth/routes/signup.ts  
// L'utilisateur est inséré en base...  
const newUser \= await db.insert(users).values(...);

// On lance l'action (sans attendre le résultat, c'est du bonus)  
await Hooks.doAction('user\_created', { userId: newUser.id, email: newUser.email });

// 2\. Dans /modules/stripe/index.ts  
Hooks.addAction('user\_created', async (payload) \=\> {  
    const stripeCustomer \= await stripe.customers.create({ email: payload.email });  
    await db.update(users).set({ stripeId: stripeCustomer.id }).where({ id: payload.userId });  
});

// 3\. Dans /modules/email/index.ts  
Hooks.addAction('user\_created', async (payload) \=\> {  
    await sendEmail(payload.email, "Bienvenue sur notre SaaS \!");

});

### **Résumé de l'expérience utilisateur (L'Artisan)**

1. L'artisan déploie SaaS OS en 1 clic.  
2. Il arrive sur un magnifique écran d'installation : "Bienvenue. Connectons votre base de données."  
3. Il arrive dans son espace /admin. C'est vide, il n'y a que la gestion de son compte.  
4. Il va dans l'onglet **"Modules"** (comme WP Plugins).  
5. Il voit "Module Calendrier". Il clique sur "Activer".  
   \-\> *Sous le capot, le schéma DB du calendrier est injecté, les routes /calendar sont activées.*  
6. Le lien "Mon Calendrier" apparaît magiquement dans sa sidebar (grâce au système de Filtres).  
7. Il veut faire payer les rendez-vous, il active "Stripe".  
8. Un Agent IA intégré au back-office lui demande : *"Voulez-vous que la réservation du calendrier nécessite un paiement Stripe ?"*. Il clique sur "Oui".  
   \-\> *L'IA écrit discrètement un addFilter('calendar\_booking\_validation', ...) qui vérifie le paiement avant de valider le RDV.*

## 11\. **Les "Blueprints" (Cas d'Usages Métiers)**

Pour comprendre la flexibilité de **SaaS OS**, voici comment différents professionnels peuvent configurer leur outil en quelques clics depuis leur interface d'administration, sans écrire une seule ligne de code.

### **🛠️ Cas n°1 : Le "SaaS de Réservation" (Pour l'Artisan, le Thérapeute ou le Consultant)**

*Le besoin : Un plombier ou un psychologue veut arrêter de gérer ses rendez-vous sur Excel et par SMS. Il veut un portail où ses clients réservent et paient un acompte.*

**Les Modules activés :**

1. **Module CRM (Clients) :** Gère la base de données des clients et l'historique.  
2. **Module Calendrier :** Affiche les créneaux disponibles et gère les conflits.  
3. **Module Stripe (Paiement) :** Permet la facturation.  
4. **Module Notifications (SMS/Email) :** Envoie des rappels.

**La Magie des Hooks (Sous le capot) :**

* L'artisan clique sur un bouton généré par l'IA : *"Exiger un paiement pour valider un RDV"*.  
* Le Hook addFilter('calendar\_booking\_status') est activé.  
* Désormais, quand le client choisit un créneau, le calendrier attend le retour du Webhook Stripe (doAction('stripe\_payment\_success')) pour verrouiller la date et déclencher le SMS de confirmation.

---

### **🎓 Cas n°2 : Le "SaaS E-Learning / Communauté" (Pour le Créateur de Contenu)**

*Le besoin : Un expert en marketing veut vendre une formation vidéo mensuelle avec un espace d'échange privé pour ses élèves (façon Skool ou Patreon).*

**Les Modules activés :**

1. **Module Paywall (Abonnements) :** Gère les plans mensuels (ex: 29€/mois) et les accès.  
2. **Module Vidéo (Vimeo/Mux) :** Un lecteur vidéo sécurisé anti-téléchargement.  
3. **Module Forum / Chat :** Un espace de discussion en temps réel.

**La Magie des Hooks (Sous le capot) :**

* Le créateur configure son système visuellement.  
* Le module Paywall utilise le Hook applyFilters('content\_access\_level').  
* Si un utilisateur n'a pas d'abonnement actif, les vidéos sont floutées et le Forum affiche un cadenas. Dès que l'abonnement expire (via Stripe), le Hook doAction('subscription\_expired') coupe instantanément l'accès au Chat.

---

### **🏢 Cas n°3 : Le "SaaS ERP / Outil Interne" (Pour une PME ou une Agence)**

*Le besoin : Une petite agence de design veut un espace pour suivre l'avancée des projets avec ses clients et échanger des fichiers lourds, sans payer 500€/mois pour Asana \+ Dropbox.*

**Les Modules activés :**

1. **Module Kanban :** Gestion de tâches avec des colonnes (À faire, En cours, Terminé).  
2. **Module Drive (S3/Stockage) :** Hébergement de fichiers avec gestion des dossiers.  
3. **Module Équipe (RBAC) :** Gestion fine des permissions (Admin, Employé, Client invité).

**La Magie des Hooks (Sous le capot) :**

* Le module Équipe vient filtrer l'affichage avec applyFilters('kanban\_board\_visibility').  
* Les "Clients invités" ne voient que les tâches qui leur sont assignées.  
* Lorsqu'un designer glisse la tâche dans la colonne "Terminé" (Module Kanban), cela déclenche doAction('task\_status\_changed'), ce qui alerte le Module Drive pour qu'il génère un lien de téléchargement sécurisé et l'envoie au client.

---

### **🚀 Cas n°4 : Le "SaaS Marketplace B2B" (L'Entrepreneur Ambitieux)**

*Le besoin : Un porteur de projet veut lancer un "Malt pour les architectes". Une plateforme de mise en relation où il prend une commission.*

**Les Modules activés :**

1. **Module Annuaire (Directory) :** Profils publics avec portfolio.  
2. **Module Messagerie (Inbox) :** Pour que les clients contactent les freelances.  
3. **Module Stripe Connect :** Paiement séquestre et répartition des commissions.  
4. **Module Avis (Reviews) :** Système de notation par étoiles.

**La Magie des Hooks (Sous le capot) :**

* Le client paie la prestation via la Messagerie (Hook stripe\_checkout\_session).  
* L'argent est bloqué. Quand la prestation est validée, le Hook doAction('project\_completed') libère les fonds vers l'architecte, garde la commission de la plateforme, et débloque le formulaire du Module Avis pour le client.

