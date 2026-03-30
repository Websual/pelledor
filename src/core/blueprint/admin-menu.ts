import { getBlueprintActive } from "@/core/blueprint/server";

export type AdminLink = { title: string; url: string };

const FULL_MENU: AdminLink[] = [
  { title: "Tableau de bord", url: "/admin" },
  { title: "🚀 Guide démarrage", url: "/onboarding" },
  { title: "Modules", url: "/admin/modules" },
  { title: "Apparence", url: "/admin/appearance" },
  { title: "Site vitrine (blueprint)", url: "/admin/blueprint" },
  { title: "Notes", url: "/notes" },
  { title: "Paiement / Stripe", url: "/notes/billing" },
  { title: "Profil & prestations", url: "/admin/data" },
  { title: "Planning & RDV", url: "/admin/rdv" },
  { title: "Factures", url: "/admin/factures" },
  { title: "Notifications", url: "/notifications" },
  { title: "Annuaire public", url: "/annuaire" },
  { title: "Événements", url: "/evenements" },
  { title: "Blog", url: "/blog" },
  { title: "Mes billets", url: "/mes-billets" },
  { title: "Chambres (gîte)", url: "/admin/lodging" },
  { title: "Restaurant", url: "/admin/restaurant" },
  { title: "Devis (artisan)", url: "/admin/devis" },
  { title: "Boutique (e‑commerce)", url: "/admin/shop" },
];
const BOUTIQUE_ORDER_URLS = [
  "/admin",
  "/admin/blueprint",
  "/admin/shop",
  "/notes/billing",
  "/notifications",
  "/admin/modules",
];
const RESTAURANT_ORDER_URLS = [
  "/admin",
  "/admin/blueprint",
  "/admin/restaurant",
  "/admin/data",
  "/notes/billing",
  "/notifications",
  "/admin/modules",
];
const HOTEL_ORDER_URLS = [
  "/admin",
  "/admin/blueprint",
  "/admin/lodging",
  "/admin/data",
  "/notes/billing",
  "/notes",
  "/notifications",
  "/admin/modules",
  "/admin/appearance",
];
const GITE_ORDER_URLS = [
  "/admin",
  "/admin/blueprint",
  "/admin/lodging",
  "/admin/data",
  "/notes/billing",
  "/notes",
  "/notifications",
  "/admin/modules",
  "/admin/appearance",
];
const PRATICIEN_ORDER_URLS = [
  "/admin",
  "/admin/blueprint",
  "/admin/data",
  "/admin/rdv",
  "/admin/factures",
  "/notes/billing",
  "/notifications",
  "/admin/modules",
];
const CABINET_ORDER_URLS = PRATICIEN_ORDER_URLS;
const SALON_ORDER_URLS = PRATICIEN_ORDER_URLS;
const IMMOBILIER_ORDER_URLS = [
  "/admin",
  "/admin/blueprint",
  "/admin/data",
  "/admin/rdv",
  "/admin/factures",
  "/evenements",
  "/notes/billing",
  "/notifications",
  "/annuaire",
  "/admin/modules",
];

/** Ordre menu quand blueprint Artisan actif : métier d’abord. */
const ARTISAN_ORDER_URLS = [
  "/admin",
  "/onboarding",
  "/admin/blueprint",
  "/admin/devis",
  "/admin/data",
  "/admin/rdv",
  "/admin/factures",
  "/notes/billing",
  "/notes",
  "/notifications",
  "/admin/modules",
  "/admin/appearance",
];

function orderMenu(urls: string[]): AdminLink[] {
  const byUrl = new Map(FULL_MENU.map((l) => [l.url, l]));
  const core: AdminLink[] = [];
  for (const url of urls) {
    const l = byUrl.get(url);
    if (l) core.push(l);
  }
  // Only show blueprint-relevant items — not the whole menu
  return core;
}

export async function buildAdminMenuForBlueprint(): Promise<AdminLink[]> {
  const blueprint = await getBlueprintActive();
  if (blueprint === "artisan") return orderMenu(ARTISAN_ORDER_URLS);
  if (blueprint === "boutique") return orderMenu(BOUTIQUE_ORDER_URLS);
  if (blueprint === "gite") return orderMenu(GITE_ORDER_URLS);
  if (blueprint === "hotel") return orderMenu(HOTEL_ORDER_URLS);
  if (blueprint === "praticien") return orderMenu(PRATICIEN_ORDER_URLS);
  if (blueprint === "cabinet") return orderMenu(CABINET_ORDER_URLS);
  if (blueprint === "immobilier") return orderMenu(IMMOBILIER_ORDER_URLS);
  if (blueprint === "salon") return orderMenu(SALON_ORDER_URLS);
  if (blueprint === "restaurant") return orderMenu(RESTAURANT_ORDER_URLS);
  return FULL_MENU;
}
