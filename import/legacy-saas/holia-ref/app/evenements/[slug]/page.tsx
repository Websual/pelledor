import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  MapPin,
  Video,
  Euro,
  Users,
  ChevronRight,
  Ticket,
  User,
  ArrowLeft,
  Leaf,
  BarChart3,
  Package,
  Accessibility,
  Clock,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui";
import { EventReservationWidget } from "@/components/event-reservation-widget";
import { AskQuestionButton } from "@/components/ask-question-button";
import { EventSuccessBanner } from "@/components/event-success-banner";

interface EventPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ reserved?: string; amount?: string }>;
}

async function getEvent(slug: string) {
  try {
    const event = await prisma.events.findFirst({
      where: {
        slug,
        status: "active",
        remaining_places: { gt: 0 },
        date: { gte: new Date() },
        practitioners: {
          is_active: true,
        },
      },
      include: {
        practitioners: {
          select: {
            id: true,
            user_id: true,
            slug: true,
            title: true,
            photo_url: true,
            bio: true,
            location_city: true,
            address: true,
            professions: { select: { name: true } },
          },
        },
      },
    });
    return event;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

function formatPrice(cents: number) {
  if (cents === 0) return "Gratuit";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONFERENCE: "Conférence",
  ATELIER: "Atelier",
  STAGE: "Stage",
};

const LEVEL_LABELS: Record<string, string> = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
  TOUS: "Tous niveaux",
};

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) {
    return { title: "Événement introuvable" };
  }
  const dateStr = format(event.date, "d MMMM yyyy", { locale: fr });
  const priceStr = formatPrice(event.price_cents);
  return {
    title: `${event.title} | ${dateStr} | Holia`,
    description:
      event.description?.slice(0, 155) ||
      `${event.title} - ${dateStr} - ${priceStr}. Réservez votre place sur Holia.`,
    openGraph: {
      title: event.title,
      description: event.description?.slice(0, 200) || undefined,
      images: (event as { banner_url?: string }).banner_url
        ? [(event as { banner_url?: string }).banner_url!]
        : event.poster_url && !event.poster_url.toLowerCase().endsWith(".pdf")
          ? [event.poster_url]
          : undefined,
      type: "website",
    },
  };
}

export default async function EventDetailPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const event = await getEvent(slug);

  if (!event) notFound();

  const practitioner = event.practitioners;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://holia.me";
  const toAbs = (url: string) => (url.startsWith("http") ? url : `${baseUrl}${url}`);
  const bannerUrl = (event as { banner_url?: string }).banner_url
    ? toAbs((event as { banner_url?: string }).banner_url!)
    : null;
  const posterUrl = event.poster_url ? toAbs(event.poster_url) : null;
  const heroImageUrl = bannerUrl || (posterUrl && !posterUrl.toLowerCase().endsWith(".pdf") ? posterUrl : null);

  const locationSchema =
    event.location_type === "VIDEO_ONLY"
      ? {
          "@type": "VirtualLocation" as const,
          name: "En ligne",
        }
      : {
          "@type": "Place" as const,
          name: event.address || practitioner?.location_city || "Lieu à préciser",
          address: event.address || practitioner?.address
            ? {
                "@type": "PostalAddress" as const,
                streetAddress: event.address || practitioner?.address,
                addressLocality: practitioner?.location_city,
                addressCountry: "FR",
              }
            : undefined,
        };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.date.toISOString(),
    description: event.description || event.title,
    image: heroImageUrl ? [heroImageUrl] : undefined,
    location: locationSchema,
    offers: {
      "@type": "Offer",
      price: (event.price_cents / 100).toString(),
      priceCurrency: "EUR",
      availability:
        event.remaining_places > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: `${baseUrl}/evenements/${event.slug}`,
    },
    organizer: practitioner
      ? {
          "@type": "Person",
          name: practitioner.title,
          url: `${baseUrl}/praticien/${practitioner.slug}`,
        }
      : undefined,
  };

  const typeLabel = EVENT_TYPE_LABELS[event.event_type] || "Événement";
  const participantsCount = event.capacity - event.remaining_places;
  const minParticipants = (event as { min_participants?: number }).min_participants ?? 1;
  const hoursUntilEvent = (event.date.getTime() - Date.now()) / (1000 * 60 * 60);
  const showUrgencyBanner = hoursUntilEvent > 0 && hoursUntilEvent < 48;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-[#f7f7f7] pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/evenements"
            className="inline-flex items-center gap-2 text-sm text-anthracite/70 hover:text-sauge mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux événements
          </Link>

          {showUrgencyBanner && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
              <Clock className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <p className="font-semibold text-amber-800">
                Dernières places disponibles !
              </p>
              <p className="text-sm text-amber-700">
                L&apos;événement a lieu dans moins de 48h.
              </p>
            </div>
          )}

          {search?.reserved === "offline" && search?.amount && (
            <EventSuccessBanner amountCents={parseInt(search.amount, 10)} />
          )}

          {minParticipants > 1 && (
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-anthracite">
                  {participantsCount} / {minParticipants} réservations pour que l&apos;événement soit confirmé
                </span>
                <span className="text-sm text-anthracite/60">
                  {Math.min(100, Math.round((participantsCount / minParticipants) * 100))} %
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-sauge transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, (participantsCount / minParticipants) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {participantsCount > 0 && minParticipants <= 1 && (
            <div className="mb-6 p-4 rounded-2xl bg-sauge/10 border border-sauge/20 flex items-center gap-3">
              <Users className="h-6 w-6 text-sauge flex-shrink-0" />
              <p className="font-semibold text-anthracite">
                Déjà {participantsCount} participant{participantsCount > 1 ? "s" : ""} inscrit{participantsCount > 1 ? "s" : ""} !
              </p>
            </div>
          )}

          {participantsCount > 0 && minParticipants > 1 && participantsCount >= minParticipants && (
            <div className="mb-6 p-4 rounded-2xl bg-sauge/10 border border-sauge/20 flex items-center gap-3">
              <Users className="h-6 w-6 text-sauge flex-shrink-0" />
              <p className="font-semibold text-anthracite">
                Minimum atteint ! L&apos;événement est confirmé.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contenu principal (2 colonnes) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero */}
              <div className="relative rounded-3xl overflow-hidden bg-white shadow-sm border border-gray-100">
                <div className="relative aspect-[21/9] md:aspect-[3/1] min-h-[220px]">
                  {heroImageUrl ? (
                    <Image
                      src={heroImageUrl}
                      alt={event.title}
                      fill
                      className="object-cover object-center"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      priority
                      unoptimized={heroImageUrl.startsWith("/")}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-sauge/30 via-sauge/10 to-white flex items-center justify-center">
                      <Leaf className="h-24 w-24 text-sauge/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-sauge text-white mb-3">
                      {typeLabel}
                    </span>
                    <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg">
                      {event.title}
                    </h1>
                    <div className="flex flex-wrap gap-3 mt-4">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-anthracite text-sm font-medium">
                        <Calendar className="h-4 w-4 text-sauge" />
                        {format(event.date, "EEEE d MMMM yyyy 'à' HH:mm", {
                          locale: fr,
                        })}
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-anthracite text-sm font-medium">
                        <Euro className="h-4 w-4 text-sauge" />
                        {formatPrice(event.price_cents)}
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-anthracite text-sm font-medium">
                        <Users className="h-4 w-4 text-sauge" />
                        {event.remaining_places} places restantes
                      </span>
                    </div>
                  </div>
                </div>
                {posterUrl && (
                  <div className="absolute top-4 right-4 z-10">
                    <a
                      href={posterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 hover:bg-white text-anthracite text-sm font-medium shadow-sm transition-colors"
                    >
                      <Download className="h-4 w-4 text-sauge" />
                      Télécharger le programme / affiche
                    </a>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-anthracite mb-4">
                    À propos de cet événement
                  </h2>
                  <div className="prose prose-anthracite max-w-none text-anthracite/80 leading-relaxed">
                    <p className="whitespace-pre-wrap">{event.description}</p>
                  </div>
                </div>
              )}

              {/* Infos pratiques */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-anthracite mb-4">
                  Informations pratiques
                </h2>
                <div className="space-y-4">
                  {event.level && LEVEL_LABELS[event.level] && (
                    <div className="flex items-start gap-3">
                      <BarChart3 className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-anthracite">Niveau</p>
                        <p className="text-sm text-anthracite/70">
                          {LEVEL_LABELS[event.level]}
                        </p>
                      </div>
                    </div>
                  )}
                  {event.material_required && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-anthracite">Matériel à prévoir</p>
                        <p className="text-sm text-anthracite/70">
                          {event.material_required}
                        </p>
                      </div>
                    </div>
                  )}
                  {event.accessibility && (
                    <div className="flex items-start gap-3">
                      <Accessibility className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-anthracite">Accessibilité</p>
                        <p className="text-sm text-anthracite/70">
                          {event.accessibility}
                        </p>
                      </div>
                    </div>
                  )}
                  {event.location_type === "VIDEO_ONLY" ? (
                    <div className="flex items-start gap-3">
                      <Video className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-anthracite">En visioconférence</p>
                        <p className="text-sm text-anthracite/70">
                          Un lien vous sera envoyé par email après réservation.
                        </p>
                      </div>
                    </div>
                  ) : event.location_type === "PRESENTIAL_ONLY" ? (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-anthracite">
                          {event.address || practitioner?.address || "Adresse à préciser"}
                        </p>
                        {practitioner?.location_city && (
                          <p className="text-sm text-anthracite/70">
                            {practitioner.location_city}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-anthracite">Présentiel et visio</p>
                        <p className="text-sm text-anthracite/70">
                          {event.address || practitioner?.address || practitioner?.location_city}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* À propos de l'organisateur */}
              {practitioner && (
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-anthracite mb-4">
                    À propos de l&apos;organisateur
                  </h2>
                  <Link
                    href={`/praticien/${practitioner.slug}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#f7f7f7] hover:bg-sauge/5 transition-colors group mb-4"
                  >
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-sauge/10 flex-shrink-0">
                      {practitioner.photo_url ? (
                        <Image
                          src={practitioner.photo_url}
                          alt={practitioner.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-sauge font-bold text-lg">
                          {practitioner.title
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-anthracite group-hover:text-sauge transition-colors">
                        {practitioner.title}
                      </p>
                      <p className="text-sm text-anthracite/60">
                        {practitioner.professions?.name || "Praticien"} •{" "}
                        {practitioner.location_city}
                      </p>
                      {practitioner.bio && (
                        <p className="text-sm text-anthracite/70 mt-2 line-clamp-2">
                          {practitioner.bio}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-anthracite/40 group-hover:text-sauge transition-colors flex-shrink-0" />
                  </Link>
                  {practitioner.user_id && (
                    <AskQuestionButton
                      practitionerUserId={practitioner.user_id}
                      eventSlug={event.slug}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Widget d'achat sticky */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-28">
                <EventReservationWidget
                  event={{
                    id: event.id,
                    slug: event.slug,
                    price_cents: event.price_cents,
                    remaining_places: event.remaining_places,
                    capacity: event.capacity,
                    allow_on_site_payment: event.allow_on_site_payment ?? false,
                    location_type: event.location_type,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
