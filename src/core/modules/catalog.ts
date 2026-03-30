export type ModuleCatalogEntry = {
  slug: string;
  name: string;
  description: string;
  requiredByBuild: boolean;
  dependsOn: string[];
};

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    slug: "core-auth",
    name: "Authentification",
    description: "Connexion, sessions.",
    requiredByBuild: true,
    dependsOn: [],
  },
  {
    slug: "notes",
    name: "Notes",
    description: "Notes payantes (Stripe).",
    requiredByBuild: false,
    dependsOn: [],
  },
  {
    slug: "stripe",
    name: "Stripe",
    description: "Checkout, webhook, customers.",
    requiredByBuild: false,
    dependsOn: [],
  },
  {
    slug: "directory",
    name: "Annuaire",
    description: "Professions, praticiens (legacy practitioners).",
    requiredByBuild: false,
    dependsOn: [],
  },
  {
    slug: "booking",
    name: "Rendez-vous",
    description: "Services, creneaux, appointments.",
    requiredByBuild: false,
    dependsOn: ["directory"],
  },
  {
    slug: "billing",
    name: "Facturation",
    description: "Factures liees praticien / RDV.",
    requiredByBuild: false,
    dependsOn: ["directory", "booking"],
  },
  {
    slug: "events",
    name: "Evenements",
    description: "Billetterie (events + tickets).",
    requiredByBuild: false,
    dependsOn: ["directory"],
  },
  {
    slug: "blog",
    name: "Blog",
    description: "Articles marketing_posts.",
    requiredByBuild: false,
    dependsOn: [],
  },
  {
    slug: "notifications",
    name: "Notifications",
    description: "File in-app.",
    requiredByBuild: false,
    dependsOn: [],
  },
  {
    slug: "gift-cards",
    name: "Cartes cadeaux",
    description: "Codes et validation.",
    requiredByBuild: false,
    dependsOn: ["directory"],
  },
  {
    slug: "chat",
    name: "Chat RDV",
    description: "Messages par appointment (chiffrage a ajouter).",
    requiredByBuild: false,
    dependsOn: ["booking"],
  },
  {
    slug: "lodging",
    name: "Hebergement",
    description: "Chambres, nuits, dispo par produit, Stripe.",
    requiredByBuild: false,
    dependsOn: ["directory"],
  },
  {
    slug: "artisan-quotes",
    name: "Devis artisan",
    description: "Demandes de devis + lien facture brouillon.",
    requiredByBuild: false,
    dependsOn: ["directory", "billing"],
  },
  {
    slug: "restaurant",
    name: "Restaurant",
    description: "Tables, reservations 90 min, attribution auto.",
    requiredByBuild: false,
    dependsOn: ["directory"],
  },
  {
    slug: "shop",
    name: "Boutique / E‑commerce",
    description: "Catalogue, panier, commande, frais de port, Stripe.",
    requiredByBuild: false,
    dependsOn: ["stripe"],
  },
  {
    slug: "anamnese",
    name: "Anamnèse",
    description: "Formulaire pré-consultation envoyé au patient avant le premier RDV. Intégré dans la fiche patient.",
    requiredByBuild: false,
    dependsOn: ["booking"],
  },
  {
    slug: "click-collect",
    name: "Click & Collect",
    description: "Commande à emporter avec créneau de retrait et paiement Stripe à la commande.",
    requiredByBuild: false,
    dependsOn: ["stripe", "restaurant"],
  },
];
