import type { Metadata } from "next";

interface PractitionerSeoInput {
  name: string;
  specialty?: string | null;
  city?: string | null;
  bio?: string | null;
  imageUrl?: string | null;
  slug?: string | null;
}

/**
 * Génère des metadata Next.js optimisées SEO pour les pages publiques des praticiens/établissements.
 * Compatible Google Business, og:type business.business, rich snippets.
 */
export function buildPractitionerMeta(
  p: PractitionerSeoInput,
  opts?: {
    pageType?: "profile" | "booking" | "quote" | "menu" | "order";
    noIndex?: boolean;
  }
): Metadata {
  const { pageType = "profile", noIndex = false } = opts ?? {};

  const pageTitles: Record<string, string> = {
    profile: `${p.name}${p.specialty ? ` — ${p.specialty}` : ""}${p.city ? ` à ${p.city}` : ""}`,
    booking: `Prendre RDV — ${p.name}${p.city ? ` à ${p.city}` : ""}`,
    quote: `Demande de devis — ${p.name}${p.city ? ` à ${p.city}` : ""}`,
    menu: `Menu & Réservation — ${p.name}${p.city ? ` à ${p.city}` : ""}`,
    order: `Commander à emporter — ${p.name}${p.city ? ` à ${p.city}` : ""}`,
  };

  const pageDescriptions: Record<string, string> = {
    profile: p.bio?.slice(0, 155) ?? `Découvrez ${p.name}${p.specialty ? `, spécialiste ${p.specialty}` : ""}${p.city ? ` à ${p.city}` : ""}. Prise de RDV en ligne.`,
    booking: `Réservez votre créneau en ligne avec ${p.name}${p.city ? ` à ${p.city}` : ""}. Rapide, gratuit, sans commission.`,
    quote: `Demandez un devis gratuit à ${p.name}${p.city ? ` à ${p.city}` : ""}. Réponse rapide garantie.`,
    menu: `Consultez le menu de ${p.name}${p.city ? ` à ${p.city}` : ""} et réservez votre table en ligne.`,
    order: `Commandez à emporter chez ${p.name}${p.city ? ` à ${p.city}` : ""}. Choisissez votre créneau de retrait.`,
  };

  const title = pageTitles[pageType];
  const description = pageDescriptions[pageType];

  return {
    title,
    description,
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fr_FR",
      ...(p.imageUrl ? { images: [{ url: p.imageUrl, width: 1200, height: 630, alt: p.name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(p.imageUrl ? { images: [p.imageUrl] } : {}),
    },
  };
}

/**
 * Génère un JSON-LD LocalBusiness pour les praticiens / établissements.
 * À injecter via <script type="application/ld+json"> dans le head.
 */
export function buildLocalBusinessJsonLd(p: PractitionerSeoInput & { phone?: string; url?: string }): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: p.name,
    description: p.bio ?? undefined,
    address: p.city
      ? {
          "@type": "PostalAddress",
          addressLocality: p.city,
          addressCountry: "FR",
        }
      : undefined,
    telephone: p.phone ?? undefined,
    url: p.url ?? undefined,
    image: p.imageUrl ?? undefined,
  });
}
