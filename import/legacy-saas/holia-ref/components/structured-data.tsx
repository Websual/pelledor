import { getPractitionerRating } from "@/lib/practitioner-rating";

interface StructuredDataProps {
  practitioner?: any & {
    title: string;
    bio: string;
    location_city: string;
    address?: string | null;
    photo_url?: string | null;
    phone?: string | null;
    lat?: number | null;
    lng?: number | null;
    rating_avg?: number;
    google_rating?: number | null;
    google_review_count?: number | null;
    services?: Array<{ name: string; price_cents: number; description?: string | null }>;
    professions?: { name: string } | null;
    _count?: { reviews: number };
    visibleReviewsCount?: number;
  };
  /** Slug du praticien pour l'URL canonique */
  slug?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://holia.me";

export function StructuredData({ practitioner, slug }: StructuredDataProps) {
  if (!practitioner) {
    // Organization structured data for homepage
    const organizationData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Holia",
      url: BASE_URL,
      description:
        "Plateforme de réservation bien-être locale - Découvrez, réservez et vivez des expériences de bien-être autour de vous",
      logo: `${BASE_URL}/logo-h-green.webp`,
    };

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
    );
  }

  // ProfessionalService / LocalBusiness pour la page praticien (étoiles dans les résultats Google)
  // Utilise la note Holia en priorité, sinon la note Google pour remplir AggregateRating
  const holiaReviewCount = practitioner.visibleReviewsCount ?? practitioner._count?.reviews ?? 0;
  const { rating, reviewCount } = getPractitionerRating({
    rating_avg: practitioner.rating_avg,
    _count: { reviews: holiaReviewCount },
    google_rating: practitioner.google_rating,
    google_review_count: practitioner.google_review_count,
  });
  const hasRating = rating > 0 && reviewCount > 0;

  const localBusinessData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: practitioner.title,
    description: practitioner.bio?.substring(0, 500) || undefined,
    url: slug ? `${BASE_URL}/praticien/${slug}` : undefined,
    image: practitioner.photo_url || undefined,
    telephone: practitioner.phone || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: practitioner.location_city,
      streetAddress: practitioner.address || undefined,
      addressCountry: "FR",
    },
    ...(practitioner.lat != null && practitioner.lng != null && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: practitioner.lat,
        longitude: practitioner.lng,
      },
    }),
    ...(practitioner.professions && {
      jobTitle: practitioner.professions.name,
    }),
    ...(hasRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.toFixed(1),
        reviewCount: String(reviewCount),
        bestRating: "5",
        worstRating: "1",
      },
    }),
    ...(practitioner.services?.length && {
      offers: practitioner.services.map((s: { name: string; price_cents: number; description?: string | null }) => ({
        "@type": "Offer",
        name: s.name,
        price: (s.price_cents / 100).toString(),
        priceCurrency: "EUR",
        description: s.description || undefined,
      })),
    }),
  };

  // Nettoyer les champs undefined pour un JSON propre
  const cleaned = Object.fromEntries(
    Object.entries(localBusinessData).filter(([, v]) => v !== undefined && v !== "")
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleaned) }}
    />
  );
}

