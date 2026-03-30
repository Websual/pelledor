
import Link from "next/link";
import { MapPin, Star, Verified, Clock, Euro, Phone, Globe, Languages as LanguagesIcon, CreditCard, Shield, Award, Bus, Car, Building2, Instagram, User, FileText, GraduationCap, MessageSquare, ArrowLeft, Calendar, Gift, AlertTriangle, CheckCircle, DoorOpen, Wallet, Info, Tag, Sparkles, Hash, Briefcase } from "lucide-react";
import { ReviewCard } from "@/components/review-card";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { StructuredData } from "@/components/structured-data";
import { PractitionerSidebarNav } from "@/components/practitioner-sidebar-nav";
import { FavoriteButton } from "@/components/favorite-button";
import { WorkingHoursDisplay } from "@/components/working-hours-display";
import { GallerySection } from "@/components/gallery-section";
import { PrestationsSection } from "@/components/prestations-section";
import { BoutiqueSection } from "@/components/boutique-section";
import { QualificationTimeline } from "@/components/qualification-timeline";
import { BookingWidget } from "@/components/booking-widget";
import { Card, CardContent, Button } from "@/components/ui";
import { format, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordProfileView } from "@/lib/profile-views";
import { getPractitionerRating } from "@/lib/practitioner-rating";
import { GoogleIcon } from "@/components/google-icon";
import { AdBanner } from "@/components/ui/AdBanner";

interface PractitionerPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Extrait les mots-clés d'un slug (ex: karine-baroillot-vital-k-pau → nameWords + city). */
function parseSlugToKeywords(slug: string): { nameWords: string[]; city: string; nameForSearch: string } {
  const parts = slug.split("-").filter(Boolean);
  if (parts.length === 0) return { nameWords: [], city: "", nameForSearch: "" };
  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  if (parts.length === 1) {
    return { nameWords: [titleCase(parts[0])], city: "", nameForSearch: titleCase(parts[0]) };
  }
  const city = titleCase(parts[parts.length - 1]);
  const nameParts = parts.slice(0, -1).map(titleCase);
  const nameForSearch = nameParts.length >= 2
    ? `${nameParts[0]} ${nameParts[1]}`
    : nameParts.join(" ");
  return { nameWords: nameParts, city, nameForSearch };
}

/** Bio affichée : bio réelle ou template SEO pour fiches INSEE sans bio. */
function getDisplayBio(p: {
  bio: string | null;
  source_url: string | null;
  title: string;
  location_city: string;
  professions?: { name: string } | null;
}): string | null {
  if (p.bio != null && p.bio.trim() !== "") return p.bio.trim();
  if (p.source_url === "INSEE") {
    const name = p.title.includes(" - ") ? p.title.split(" - ")[0] : p.title;
    const profession = p.professions?.name ?? "Praticien";
    return `Retrouvez toutes les informations professionnelles de ${name}, ${profession} à ${p.location_city}. Profil référencé via les registres officiels de l'INSEE. Prenez le contrôle de cette fiche pour ajouter votre présentation complète.`;
  }
  return null;
}

/** Cherche un praticien (source INSEE ou Scouter) avec un nom similaire dans la même ville. */
async function findSimilarPractitionerBySlug(
  nameWords: string[],
  city: string
): Promise<{ slug: string } | null> {
  if (!city || nameWords.length === 0) return null;
  const andConditions = nameWords.slice(0, 2).map((w) => ({
    title: { contains: w, mode: "insensitive" as const },
  }));
  const practitioner = await prisma.practitioners.findFirst({
    where: {
      is_active: true,
      location_city: { equals: city, mode: "insensitive" },
      source_url: { in: ["SCOUTER", "INSEE"] },
      AND: andConditions,
    },
    select: { slug: true },
  });
  return practitioner;
}

async function getPractitioner(slug: string) {
  try {
    const practitioner = await prisma.practitioners.findFirst({
      where: {
        slug,
        is_active: true,
      },
      include: {
        professions: true,
        services: {
          orderBy: {
            price_cents: "asc",
          },
        },
        working_hours: {
          where: { is_active: true },
          orderBy: [
            { day_of_week: "asc" },
            { start_time: "asc" },
          ],
        },
        qualifications: {
          orderBy: {
            obtained_year: "desc",
          },
        },
        products: {
          where: { stock: { gt: 0 } },
        },
        practitioner_updates: {
          where: {
            is_active: true,
            OR: [
              { ends_at: null },
              { ends_at: { gte: new Date() } },
            ],
          },
          include: { marketing_posts: { take: 1 } },
          orderBy: { created_at: "desc" },
        },
        reviews: {
          where: {
            is_hidden: false,
            needs_review: false, // Masquer les avis en attente de modération
          } as any,
          select: {
            id: true,
            appointment_id: true,
            rating: true,
            comment: true,
            response: true,
            created_at: true,
            users: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
            appointments: true,
          },
        },
      },
    });

    if (!practitioner) return null;

    // Nombre de mutuelles qui remboursent cette profession
    let mutuellesCount = 0;
    if (practitioner.profession_id) {
      mutuellesCount = await prisma.profession_mutuelles.count({
        where: { profession_id: practitioner.profession_id },
      });
    }

    // Nombre d'avis visibles (pour AggregateRating JSON-LD)
    const visibleReviewsCount = await prisma.reviews.count({
      where: {
        practitioner_id: practitioner.id,
        is_hidden: false,
        needs_review: false,
      },
    });

    // Promotions actives par service : jointure marketing_posts (type PROMOTION = discount_percentage défini)
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const servicePromotions: Record<string, { discountPercentage: number; discountedPriceCents: number; endDate: string }> = {};
    const marketingPosts = await prisma.marketing_posts.findMany({
      where: {
        practitioner_id: practitioner.id,
        discount_percentage: { not: null },
        start_date: { lte: dayEnd },
        end_date: { gte: dayStart },
        OR: [
          { service_id: null },
          { service_id: { in: (practitioner.services || []).map((s) => s.id) } },
        ],
      },
      orderBy: { discount_percentage: "desc" },
    });
    const servicesList = practitioner.services || [];
    for (const mp of marketingPosts) {
      if (!mp.discount_percentage || mp.discount_percentage <= 0) continue;
      const discount = Math.min(100, Math.max(0, mp.discount_percentage));
      const targetIds = mp.service_id ? [mp.service_id] : servicesList.map((s) => s.id);
      for (const sid of targetIds) {
        const svc = servicesList.find((s) => s.id === sid);
        if (svc?.price_cents) {
          const discounted = Math.round(svc.price_cents * (1 - discount / 100));
          if (!servicePromotions[sid] || discount > (servicePromotions[sid]?.discountPercentage ?? 0)) {
            servicePromotions[sid] = {
              discountPercentage: discount,
              discountedPriceCents: discounted,
              endDate: mp.end_date.toISOString(),
            };
          }
        }
      }
    }

    return { ...practitioner, visibleReviewsCount, mutuellesCount, servicePromotions };
  } catch (error) {
    console.error("Error fetching practitioner:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PractitionerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const practitioner = await getPractitioner(slug);

  if (!practitioner) {
    return {
      title: "Praticien non trouvé | Holia.me",
      description: "Le praticien demandé n'a pas été trouvé.",
    };
  }

  // Profils non réclamés : utiliser un terme générique au lieu du job_title précis (respect des titres protégés)
  const displayTitle = practitioner.is_claimed
    ? practitioner.title
    : practitioner.title.includes(" - ")
      ? `${practitioner.title.split(" - ")[0]} - Praticien Bien-être`
      : `${practitioner.title} - Praticien Bien-être`;

  const title = `${displayTitle} à ${practitioner.location_city} | Holia.me`;
  const displayBio = getDisplayBio(practitioner);
  const plainBio = displayBio ? displayBio.replace(/<[^>]*>/g, "").trim() : "";
  const description = plainBio ? `${plainBio.substring(0, 160)}${plainBio.length > 160 ? "..." : ""}` : "";
  const category = practitioner.professions ? `${practitioner.professions.name} - ` : "";
  const rating = practitioner.rating_avg > 0 ? ` ${practitioner.rating_avg.toFixed(1)}/5` : "";
  const visibleReviewsCount = practitioner.visibleReviewsCount ?? practitioner._count?.reviews ?? 0;
  const reviewsCount = visibleReviewsCount > 0 ? ` (${visibleReviewsCount} avis)` : "";

  return {
    title,
    description: `${category}${description}${rating}${reviewsCount}`,
    keywords: [
      practitioner.title,
      practitioner.location_city,
      practitioner.professions?.name || "",
      "bien-être",
      "praticien",
      "réservation",
      "Holia.me",
    ].filter(Boolean),
    openGraph: {
      title,
      description: `${category}${description}${rating}${reviewsCount}`,
      type: "profile",
      locale: "fr_FR",
      url: `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}/praticien/${slug}`,
      images: practitioner.photo_url
        ? [
            {
              url: practitioner.photo_url,
              alt: practitioner.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: `${category}${description}${rating}${reviewsCount}`,
      images: practitioner.photo_url ? [practitioner.photo_url] : [],
    },
    alternates: {
      canonical: `/praticien/${slug}`,
    },
  };
}

export default async function PractitionerPage({ params, searchParams }: PractitionerPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const promoServiceId = typeof sp?.service === "string" ? sp.service : typeof sp?.promo === "string" ? sp.promo : undefined;

  const practitioner = await getPractitioner(slug);
  const session = await getServerSession(authOptions);

  if (!practitioner) {
    const { nameWords, city, nameForSearch } = parseSlugToKeywords(slug);
    const similar = await findSimilarPractitionerBySlug(nameWords, city);
    if (similar) {
      permanentRedirect(`/praticien/${similar.slug}`);
    }
    if (city && nameForSearch) {
      const searchUrl = `/recherche?q=${encodeURIComponent(nameForSearch)}&city=${encodeURIComponent(city)}`;
      redirect(searchUrl);
    }
    notFound();
  }

  // Enregistrer la vue (debounce 1/jour/visiteur, pas si praticien lui-même)
  const headersList = await headers();
  recordProfileView(
    practitioner.id,
    practitioner.user_id ?? null,
    session,
    headersList
  ).catch(() => {});

  const visibleReviewsCount = practitioner.visibleReviewsCount ?? practitioner._count?.reviews ?? 0;

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2) + "€";
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
  };

  const breadcrumbItems = [
    { label: "Recherche", href: "/recherche" },
    ...(practitioner.professions
      ? [{ label: practitioner.professions.name, href: `/recherche?profession=${practitioner.professions.id}` }]
      : []),
    { label: practitioner.title },
  ];

  // Use real data from profile
  const expertiseTags = practitioner.treatment_keywords && practitioner.treatment_keywords.length > 0 
    ? practitioner.treatment_keywords 
    : [];

  return (
    <>
      <StructuredData practitioner={practitioner} slug={slug} />
      <PractitionerSidebarNav />
      <main className="bg-[#f7f7f7] min-h-screen">
        {/* Wide Container */}
        <div className="max-w-[1600px] mx-auto px-6 2xl:px-16">
          {/* Back Button & Actions */}
          <div className="flex items-center justify-between py-6 pt-28 gap-4">
            <Link
              href="/recherche"
              className="flex items-center gap-2 text-anthracite hover:text-sauge transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Retour à la recherche</span>
            </Link>
            <div className="flex items-center gap-3 flex-shrink-0">
              <FavoriteButton practitionerId={practitioner.id} />
            </div>
          </div>

          {/* Main Grid: 2/3 Content + 1/3 Booking Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[3.5fr_1.5fr] gap-16 pb-12">
            {/* Left Column: Content (2/3) */}
            <div className="space-y-8">
              {/* Hero Section */}
              <div id="hero" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
                  {/* Photo */}
                  <div className="relative w-full aspect-square md:w-[250px] md:h-[250px] rounded-3xl border border-sable overflow-hidden">
                    {practitioner.photo_url ? (
                      <Image
                        src={practitioner.photo_url}
                        alt={practitioner.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-sauge/20 flex items-center justify-center">
                        <span className="text-4xl font-bold text-sauge">
                          {practitioner.title.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="space-y-3">
                    {/* Badge profil certifié (unclaimed, 0 avis Holia) */}
                    {!practitioner.is_claimed && visibleReviewsCount === 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-[#9bb49b]/10 text-[#9bb49b] text-xs font-medium border border-[#9bb49b]/30 w-fit">
                        <Shield className="h-4 w-4" /> Profil certifié (Données publiques)
                      </div>
                    )}
                    {/* Verified */}
                    {practitioner.is_verified && (
                      <div className="flex items-center gap-1 text-sauge">
                        <Shield className="h-4 w-4" />
                        <span className="text-xs font-medium">Vérifié</span>
                      </div>
                    )}
                    {/* Note (Holia ou Google) avec tooltip explicatif */}
                    {(() => {
                      const { rating, reviewCount, isExternal, googleRating, googleReviewCount } = getPractitionerRating({
                        rating_avg: practitioner.rating_avg,
                        _count: { reviews: visibleReviewsCount ?? practitioner._count?.reviews ?? 0 },
                        google_rating: practitioner.google_rating,
                        google_review_count: practitioner.google_review_count,
                      });
                      if (rating <= 0) return null;
                      const ratingTitle = isExternal
                        ? "Avis public récupéré via Google Business Profile."
                        : "Avis certifié suite à une consultation réelle sur la plateforme.";
                      return (
                        <div className="flex flex-col gap-1">
                          <div
                            className="flex items-center gap-1.5 flex-wrap"
                            title={ratingTitle}
                          >
                            {isExternal ? (
                              <GoogleIcon size={20} className="text-anthracite/80" />
                            ) : (
                              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                            )}
                            <span className="font-semibold text-anthracite">{rating.toFixed(1)}/5</span>
                            <span className="text-sm text-anthracite/60">({reviewCount} avis)</span>
                          </div>
                          {!isExternal && googleRating != null && googleReviewCount != null && googleReviewCount > 0 && (
                            <div
                              className="flex items-center gap-1 text-xs text-anthracite/60"
                              title="Avis public récupéré via Google Business Profile."
                            >
                              <GoogleIcon size={14} className="text-anthracite/60" />
                              <span>{googleRating.toFixed(1)}/5 ({googleReviewCount} avis Google)</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Name + Charte badge */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-3xl font-bold font-heading text-anthracite">
                        {practitioner.title}
                      </h1>
                      {(practitioner as { charter_accepted_at?: Date | null }).charter_accepted_at && practitioner.is_verified && (
                        <Link
                          href="/charte-deontologique"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-2xl bg-sauge/10 text-sauge hover:bg-sauge/20 transition-colors text-xs font-medium border border-sauge/20"
                          title="A signé la Charte Holia"
                        >
                          <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>A signé la Charte Holia</span>
                        </Link>
                      )}
                    </div>
                    
                    {/* Address & Phone */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {practitioner.address && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(practitioner.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-anthracite/70 hover:text-sauge transition-colors"
                        >
                          <MapPin className="h-4 w-4 text-sauge" />
                          <span className="text-sm">{practitioner.address}</span>
                        </a>
                      )}
                      {practitioner.phone && (
                        <div className="flex items-center gap-1.5 text-anthracite/70">
                          <Phone className="h-4 w-4 text-sauge" />
                          <a href={`tel:${practitioner.phone}`} className="text-sm hover:text-sauge transition-colors">
                            {practitioner.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* SIRET & Code APE (profil non réclamé) */}
                    {!practitioner.is_claimed && (practitioner.siret || practitioner.ape_code) && (
                      <div className="flex items-center gap-4 flex-wrap text-anthracite/70">
                        {practitioner.siret && (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Hash className="h-4 w-4 text-sauge" />
                            SIRET {practitioner.siret}
                          </span>
                        )}
                        {practitioner.ape_code && (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Briefcase className="h-4 w-4 text-sauge" />
                            Code APE {practitioner.ape_code}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Website, LinkedIn, Instagram */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {practitioner.website && (
                        <a
                          href={practitioner.website.startsWith('http') ? practitioner.website : `https://${practitioner.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-anthracite/70 hover:text-sauge transition-colors"
                        >
                          <Globe className="h-4 w-4 text-sauge" />
                          <span className="text-sm">Site web</span>
                        </a>
                      )}
                      {practitioner.linked_in_url && (
                        <a
                          href={practitioner.linked_in_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-anthracite/70 hover:text-sauge transition-colors"
                        >
                          <Building2 className="h-4 w-4 text-sauge" />
                          <span className="text-sm">LinkedIn</span>
                        </a>
                      )}
                      {practitioner.instagram_url && (
                        <a
                          href={practitioner.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-anthracite/70 hover:text-sauge transition-colors"
                        >
                          <Instagram className="h-4 w-4 text-sauge" />
                          <span className="text-sm">Instagram</span>
                        </a>
                      )}
                    </div>
                    
                    {/* Expertises */}
                    {expertiseTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {expertiseTags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-sauge/10 text-sauge rounded-2xl text-xs font-medium border border-sable"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Working Hours */}
                    {practitioner.working_hours && practitioner.working_hours.length > 0 && (
                      <div className="bg-[#f7f7f7] rounded-3xl p-4">
                        <WorkingHoursDisplay workingHours={practitioner.working_hours} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bandeau profil non réclamé */}
              {!practitioner.is_claimed && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        Ce profil n'a pas encore été vérifié par le praticien
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Les informations peuvent être incomplètes ou obsolètes. Le praticien peut réclamer ce profil pour le mettre à jour et recevoir des rendez-vous en ligne.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Le Cabinet (Galerie) - Full width of left column */}
              {(practitioner.gallery && practitioner.gallery.length > 0) || practitioner.access_info ? (
                <section id="cabinet" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-sable">
                    <div className="w-10 h-10 bg-sauge rounded-3xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold font-heading text-anthracite">Le Cabinet</h2>
                  </div>
                  
                  {/* Galerie */}
                  {practitioner.gallery && practitioner.gallery.length > 0 && (
                    <div className="mb-6">
                      <GallerySection images={practitioner.gallery} />
                    </div>
                  )}
                  
                  {/* Informations d'accès */}
                  {practitioner.access_info && (
                    <div className="flex items-start gap-3 p-4 bg-[#f7f7f7] rounded-3xl border border-sable">
                      <DoorOpen className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-anthracite mb-1">Informations d'accès</h3>
                        <p className="text-sm text-anthracite/70 whitespace-pre-line">{practitioner.access_info}</p>
                      </div>
                    </div>
                  )}
                </section>
              ) : null}

              {/* Présentation - bio réelle ou template INSEE */}
              {(() => {
                const displayBio = getDisplayBio(practitioner);
                if (!displayBio) return null;
                const isTemplate = practitioner.source_url === "INSEE" && !(practitioner.bio != null && practitioner.bio.trim() !== "");
                return (
                  <section id="about" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-sable">
                      <div className="w-10 h-10 bg-sauge rounded-3xl flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold font-heading text-anthracite">À propos</h2>
                    </div>
                    {isTemplate ? (
                      <p className="text-anthracite/80 leading-relaxed">{displayBio}</p>
                    ) : (
                      <div
                        className="prose prose-sm max-w-none text-anthracite/80 leading-relaxed prose-p:my-3 prose-p:leading-relaxed prose-headings:font-heading prose-h3:text-sauge prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2 prose-h3:font-semibold prose-strong:font-semibold prose-strong:text-anthracite prose-em:italic prose-em:text-anthracite/90 prose-ul:my-3 prose-ul:pl-5 prose-ol:my-3 prose-ol:pl-5 prose-li:my-0.5"
                        dangerouslySetInnerHTML={{ __html: displayBio }}
                      />
                    )}

                    {/* Vidéos YouTube */}
                    {practitioner.youtube_videos && practitioner.youtube_videos.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold text-anthracite mb-4">Vidéos</h3>
                        <div className="grid grid-cols-1 gap-4">
                          {practitioner.youtube_videos.map((videoId: string, index: number) => (
                            <div key={index} className="aspect-video w-full max-w-2xl">
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title={`Vidéo ${index + 1}`}
                                className="w-full h-full rounded-3xl"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })()}

              {/* Pub In-Article (entre Bio et Avis) — masquée pour les fiches Premium */}
              <div className="py-8">
                <AdBanner
                  dataAdSlot="1935546816"
                  dataAdFormat="fluid"
                  dataFullWidthResponsive
                  isPremium={(practitioner as { plan?: string }).plan === "PREMIUM"}
                />
              </div>

              {/* Actualités & Offres */}
              {practitioner.practitioner_updates && practitioner.practitioner_updates.length > 0 && (
                <section id="actualites" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold font-heading text-anthracite mb-4">
                    Actualités & Offres
                  </h2>
                  <div className="flex flex-col gap-3">
                    {(practitioner.practitioner_updates as {
                      id: string;
                      title: string;
                      text: string;
                      type: string;
                      promo_text: string | null;
                      created_at: Date;
                      marketing_posts?: { start_date: Date; end_date: Date }[];
                    }[]).map((update) => {
                      const isPromo = update.type === "promotion";
                      const borderColor = isPromo ? "border-l-[#9bb49b]" : "border-l-sauge/60";
                      const u = update as { marketing_posts?: { start_date: Date; end_date: Date }[]; starts_at?: Date; ends_at?: Date };
                      const mp = u.marketing_posts?.[0];
                      const startDate = mp ? format(mp.start_date, "dd/MM/yyyy", { locale: fr }) : (u.starts_at ? format(u.starts_at, "dd/MM/yyyy", { locale: fr }) : null);
                      const endDate = mp ? format(mp.end_date, "dd/MM/yyyy", { locale: fr }) : (u.ends_at ? format(u.ends_at, "dd/MM/yyyy", { locale: fr }) : null);
                      return (
                        <div
                          key={update.id}
                          className={`flex gap-4 p-6 rounded-3xl border border-slate-100 border-l-2 ${borderColor} bg-white hover:bg-sauge/[0.03] transition-colors`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isPromo ? (
                              <Tag className="h-4 w-4 text-sauge" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-sauge/80" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-4 mb-1">
                              <h3 className="font-semibold text-slate-900 text-base">{update.title}</h3>
                              <span className="text-xs text-slate-400 shrink-0">
                                Le {format(new Date(update.created_at), "dd/MM/yyyy", { locale: fr })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500">
                              {update.text}
                            </p>
                            {isPromo && startDate && endDate && (
                              <p className="text-xs text-slate-400 italic mt-3">
                                Offre valable du {startDate} au {endDate}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Prestations */}
              {practitioner.services && practitioner.services.length > 0 && (
                <section id="prestations" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-sable">
                    <div className="w-10 h-10 bg-sauge rounded-3xl flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold font-heading text-anthracite">Prestations</h2>
                  </div>
                  {practitioner.mutuellesCount > 0 && practitioner.professions && (
                    <Link
                      href={`/remboursement/${(practitioner.professions as { slug: string }).slug}`}
                      className="flex items-center gap-2 p-3 rounded-xl bg-[#9bb49b]/5 text-xs text-slate-600 hover:bg-[#9bb49b]/10 transition-colors mb-4"
                    >
                      <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: "#9bb49b" }} />
                      <span>
                        {practitioner.mutuellesCount} mutuelle
                        {practitioner.mutuellesCount > 1 ? "s" : ""} remboursent ces séances
                      </span>
                    </Link>
                  )}
                  <PrestationsSection
                    services={practitioner.services.map((s) => ({
                      id: s.id,
                      name: s.name,
                      durationMin: s.duration_min,
                      priceCents: s.price_cents,
                      locationType: s.location_type || "PRESENTIAL_ONLY",
                    }))}
                    servicePromotions={practitioner.servicePromotions ?? {}}
                  />
                </section>
              )}

              {/* Boutique */}
              {practitioner.products && practitioner.products.length > 0 && (
                <BoutiqueSection
                  products={practitioner.products.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price_cents: p.price_cents,
                    stock: p.stock,
                    image_url: p.image_url,
                  }))}
                  practitionerId={practitioner.id}
                  practitionerSlug={slug}
                />
              )}

              {/* Moyens de paiement */}
              {practitioner.paymentMethods && practitioner.paymentMethods.length > 0 && (
                <section id="paiement" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-sable">
                    <div className="w-10 h-10 bg-sauge rounded-3xl flex items-center justify-center flex-shrink-0">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold font-heading text-anthracite">Moyens de paiement</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      {practitioner.paymentMethods.map((method: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-4 py-2 bg-[#f7f7f7] rounded-2xl border border-sable"
                        >
                          <CreditCard className="h-4 w-4 text-sauge" />
                          <span className="text-sm font-medium text-anthracite">{method}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-[#9bb49b]/5 rounded-2xl border border-[#9bb49b]/20">
                      <Info className="h-4 w-4 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-anthracite/80 leading-relaxed">
                        <strong>Note :</strong> Le paiement pour la réservation en ligne se fait par carte bancaire. Les autres moyens de paiement sont acceptés pour les suppléments sur place.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Parcours (Timeline) */}
              {practitioner.qualifications && practitioner.qualifications.length > 0 && (
                <section id="parcours" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-sable">
                    <div className="w-10 h-10 bg-sauge rounded-3xl flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold font-heading text-anthracite">Parcours</h2>
                  </div>
                  <QualificationTimeline qualifications={practitioner.qualifications} />
                </section>
              )}

              {/* Avis */}
              <section id="avis" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-sable">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sauge rounded-3xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold font-heading text-anthracite">
                      Avis {visibleReviewsCount > 0 && `(${visibleReviewsCount})`}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {(() => {
                      const { rating, reviewCount, isExternal, googleRating, googleReviewCount } = getPractitionerRating({
                        rating_avg: practitioner.rating_avg,
                        _count: { reviews: visibleReviewsCount ?? practitioner._count?.reviews ?? 0 },
                        google_rating: practitioner.google_rating,
                        google_review_count: practitioner.google_review_count,
                      });
                      if (rating <= 0) return null;
                      const ratingTitle = isExternal
                        ? "Avis public récupéré via Google Business Profile."
                        : "Avis certifié suite à une consultation réelle sur la plateforme.";
                      return (
                        <>
                          <div
                            className="flex items-center gap-2"
                            title={ratingTitle}
                          >
                            {isExternal ? (
                              <GoogleIcon size={24} className="text-anthracite/80" />
                            ) : (
                              <Star className="h-6 w-6 text-[#fbbf24] fill-[#fbbf24]" />
                            )}
                            <span className="text-2xl font-bold text-anthracite">
                              {rating.toFixed(1)}/5
                            </span>
                            <span className="text-sm text-anthracite/60">({reviewCount} avis)</span>
                          </div>
                          {!isExternal && googleRating != null && googleReviewCount != null && googleReviewCount > 0 && (
                            <div
                              className="flex items-center gap-1.5 text-sm text-anthracite/70"
                              title="Avis public récupéré via Google Business Profile."
                            >
                              <GoogleIcon size={16} className="text-anthracite/70" />
                              <span>{googleRating.toFixed(1)}/5 ({googleReviewCount} avis Google)</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {session?.user && (
                      <Button asChild className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white">
                        <Link href={`/account/reviews/new?practitionerId=${practitioner.id}`}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Laisser un avis
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
                {practitioner.reviews && practitioner.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {practitioner.reviews.map((review: any) => (
                      <ReviewCard
                        key={review.id}
                        reviewId={review.id}
                        reportVariant="public"
                        rating={review.rating}
                        comment={review.comment}
                        response={review.response}
                        createdAt={review.created_at}
                        authorName={review.users?.name || "Anonyme"}
                        isVerified={Boolean(review.appointment_id)}
                        responder={{
                          name: practitioner.title,
                          photoUrl: practitioner.photo_url,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 text-anthracite/20 mx-auto mb-4" />
                    <p className="text-lg font-medium text-anthracite mb-2">
                      Aucun avis pour le moment
                    </p>
                    <p className="text-anthracite/70 max-w-md mx-auto mb-6">
                      Si vous avez bénéficié d'une prestation avec ce praticien, n'hésitez pas à partager votre expérience en déposant un avis. Votre retour est précieux pour la communauté !
                    </p>
                    {session?.user ? (
                      <Button asChild className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white">
                        <Link href={`/account/reviews/new?practitionerId=${practitioner.id}`}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Laissez le premier avis
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white">
                        <Link href={`/connexion?redirect=/praticien/${slug}#avis`}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Laissez le premier avis
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Sticky Booking Widget (1/3) */}
            <div className="lg:sticky lg:top-28 h-fit space-y-4">
              {practitioner.is_claimed ? (
                <>
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100">
                    <BookingWidget
                      practitionerId={practitioner.id}
                      services={practitioner.services.map((s) => ({
                        id: s.id,
                        name: s.name,
                        durationMin: s.duration_min,
                        priceCents: s.price_cents,
                        description: s.description,
                        locationType: s.location_type || "PRESENTIAL_ONLY",
                      }))}
                      servicePromotions={practitioner.servicePromotions ?? {}}
                      initialServiceId={promoServiceId}
                      products={practitioner.products?.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        priceCents: p.price_cents,
                        stock: p.stock,
                      })) || []}
                      acceptsGiftCards={(practitioner as any).accepts_gift_cards || false}
                      allowOfflinePayment={Boolean((practitioner as any).allow_deferred_payment)}
                    />
                  </div>
                </>
              ) : (
                /* Profil non réclamé */
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                      <User className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-anthracite mb-2">
                      Vous êtes {practitioner.title} ?
                    </h3>
                    <p className="text-sm text-anthracite/70 mb-4">
                      Activez votre profil pour recevoir des rendez-vous en ligne et gérer vos réservations.
                    </p>
                    {session?.user ? (
                      <span
                        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-2xl bg-gray-200 text-gray-500 cursor-not-allowed text-sm font-medium"
                        aria-disabled="true"
                      >
                        <User className="h-4 w-4" />
                        Réclamer ce profil (réservé aux visiteurs non connectés)
                      </span>
                    ) : (
                      <Button asChild className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                        <Link href={`/inscription?claim=${practitioner.id}`}>
                          <User className="h-4 w-4 mr-2" />
                          Réclamer ce profil
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
