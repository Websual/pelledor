"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  MapPin,
  Video,
  Ticket,
  PartyPopper,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { EventsMap } from "@/components/events-map";
import { EventsSearchFilters } from "@/components/events-search-filters";

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONFERENCE: "Conférence",
  ATELIER: "Atelier",
  STAGE: "Stage",
};

interface Event {
  id: string;
  slug: string;
  title: string;
  event_type?: string;
  description: string | null;
  banner_url?: string | null;
  poster_url: string | null;
  date: string;
  price_cents: number;
  capacity: number;
  remaining_places: number;
  location_type: string;
  address: string | null;
  practitioner: {
    id: string;
    slug: string;
    title: string;
    photo_url: string | null;
    location_city: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    profession: string | null;
  } | null;
}

function formatPrice(cents: number) {
  if (cents === 0) return "Gratuit";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function eventImageSrc(url: string | null) {
  if (!url) return "";
  return url.startsWith("http") ? url : (typeof window !== "undefined" ? window.location.origin + url : url);
}

function EventCard({
  event,
  isSelected,
}: {
  event: Event;
  isSelected: boolean;
}) {
  const router = useRouter();
  const cardImageUrl = event.banner_url || (event.poster_url && !event.poster_url.toLowerCase().endsWith(".pdf") ? event.poster_url : null);
  const practitionerPhoto = event.practitioner?.photo_url || null;
  const typeLabel = event.event_type ? EVENT_TYPE_LABELS[event.event_type] : null;

  return (
    <article
      id={`event-${event.id}`}
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/evenements/${event.slug}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/evenements/${event.slug}`)}
      className={`flex flex-col md:flex-row border-b border-sable bg-white transition-all duration-200 hover:bg-sauge/5 cursor-pointer ${
        isSelected ? "bg-sauge/5" : ""
      }`}
    >
        {/* Image à gauche (32%) - clic sur toute la carte mène à la fiche */}
        <div className="relative w-full md:w-[32%] aspect-[16/10] md:aspect-auto md:min-h-[180px] flex-shrink-0">
          {cardImageUrl ? (
            <Image
              src={eventImageSrc(cardImageUrl)}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 32vw"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sauge/20 to-sauge/5 flex items-center justify-center">
              <Ticket className="h-14 w-14 text-sauge/50" />
            </div>
          )}
          {/* Badges : type + places en haut à gauche */}
          <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
            {typeLabel && (
              <span className="px-2.5 py-1 bg-sauge/90 text-white rounded-full text-xs font-medium">
                {typeLabel}
              </span>
            )}
            <span className="px-2.5 py-1 bg-white/95 rounded-full text-xs font-medium text-anthracite/80">
              {event.remaining_places} places
            </span>
          </div>
          {/* Prix : badge unique en haut à droite */}
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 bg-white/95 rounded-full text-xs font-semibold text-sauge">
              {formatPrice(event.price_cents)}
            </span>
          </div>
        </div>

        {/* Contenu à droite */}
        <div className="flex-1 p-4 md:p-6 flex flex-col">
          <h2 className="text-lg md:text-xl font-bold text-anthracite mb-2 hover:text-sauge transition-colors">
            {event.title}
          </h2>
          <p className="text-sm text-anthracite/70 flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-sauge flex-shrink-0" />
            {format(new Date(event.date), "EEEE d MMMM yyyy 'à' HH:mm", {
              locale: fr,
            })}
          </p>
          <div className="flex items-center gap-3 text-sm text-anthracite/70 mb-3">
            {event.location_type === "VIDEO_ONLY" ? (
              <span className="flex items-center gap-1">
                <Video className="h-4 w-4" /> Visio
              </span>
            ) : event.location_type === "PRESENTIAL_ONLY" ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.address || event.practitioner?.address || event.practitioner?.location_city || "Présentiel"}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Hybride
              </span>
            )}
          </div>

          {event.description && (
            <p className="text-anthracite/80 text-sm leading-relaxed line-clamp-2 mb-4">
              {event.description}
            </p>
          )}

          {event.practitioner && (
            <div
              className="mt-auto flex items-center gap-3 pt-4 border-t border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href={`/praticien/${event.practitioner.slug}`}
                className="flex items-center gap-3 hover:opacity-90"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-sauge/10 flex-shrink-0">
                  {practitionerPhoto ? (
                    <Image
                      src={practitionerPhoto}
                      alt={event.practitioner.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-sauge font-semibold text-sm">
                      {event.practitioner.title
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-anthracite">{event.practitioner.title}</p>
                  <p className="text-xs text-anthracite/60">
                    {event.practitioner.profession || "Praticien"} • {event.practitioner.location_city}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-anthracite/50 ml-auto" />
              </Link>
            </div>
          )}
        </div>
      </article>
  );
}

function EvenementsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boundsParam = searchParams.get("bounds");
  const searchCity = searchParams.get("city") || "";
  const searchLat = searchParams.get("lat");
  const searchLng = searchParams.get("lng");
  const eventType = searchParams.get("type") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const paymentSuccess = searchParams.get("payment") === "success";

  const initialCenter =
    searchCity && searchLat && searchLng
      ? { lat: parseFloat(searchLat), lng: parseFloat(searchLng) }
      : null;

  const mapBounds = boundsParam
    ? (() => {
        const [north, south, east, west] = boundsParam.split(",").map(parseFloat);
        if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west))
          return { north, south, east, west };
        return null;
      })()
    : null;

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const debouncedBoundsRef = useRef<NodeJS.Timeout | null>(null);
  const mapFlyToRef = useRef<((coords: { lat: number; lng: number }) => void) | null>(null);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: [
      "publicEvents",
      mapBounds ? `${mapBounds.north}-${mapBounds.south}-${mapBounds.east}-${mapBounds.west}` : "all",
      searchCity,
      searchLat,
      searchLng,
      eventType,
      dateFrom,
      dateTo,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mapBounds)
        params.set("bounds", `${mapBounds.north},${mapBounds.south},${mapBounds.east},${mapBounds.west}`);
      if (searchCity) params.set("city", searchCity);
      if (searchLat) params.set("latitude", searchLat);
      if (searchLng) params.set("longitude", searchLng);
      if (eventType) params.set("type", eventType);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const scrollToEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    const el = document.getElementById(`event-${eventId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleSearchInBounds = useCallback(
    (bounds: { north: number; south: number; east: number; west: number }) => {
      if (debouncedBoundsRef.current) clearTimeout(debouncedBoundsRef.current);
      debouncedBoundsRef.current = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        params.set("bounds", `${bounds.north},${bounds.south},${bounds.east},${bounds.west}`);
        params.delete("payment");
        params.delete("city");
        router.push(`/evenements?${params.toString()}`);
        debouncedBoundsRef.current = null;
      }, 300);
    },
    [router]
  );

  useEffect(() => {
    if (paymentSuccess && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, [paymentSuccess]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const match = hash.match(/#event-(.+)/);
    if (match) scrollToEvent(match[1]);
  }, [events, scrollToEvent]);

  return (
    <main className="bg-[#f7f7f7] min-h-screen pt-24">
      <div className="min-h-screen flex flex-col">
        {/* Barre des filtres (style recherche) */}
        <EventsSearchFilters
          eventType={eventType}
          dateFrom={dateFrom}
          dateTo={dateTo}
          searchCity={searchCity}
          onCitySelected={(coords) => {
            if (mapFlyToRef.current) {
              mapFlyToRef.current(coords);
            }
          }}
        />

        {/* Layout split-screen : 45% liste à gauche, 55% carte à droite (fullscreen, pas de marges) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[45%_55%] gap-0" style={{ pointerEvents: "auto" }}>
          {/* Liste à gauche (45%) */}
          <div className="border-r-0 md:border-r border-sable order-1 md:order-1 bg-white overflow-y-auto">
            {/* Header bar fine (comme /recherche) */}
            <div className="p-4 md:p-6 pb-4 border-b border-sable bg-white">
              <h1 className="text-xl md:text-2xl font-bold font-heading text-anthracite mb-2">
                Conférences & ateliers bien-être
              </h1>
              <p className="text-sm md:text-base text-anthracite/70">
                Découvrez les prochains événements partout en France. Réservez votre place en quelques clics.
              </p>
            </div>

            {paymentSuccess && (
              <div className="mx-4 mt-4 p-4 rounded-2xl bg-sauge/10 border border-sauge/30 flex items-center gap-3">
                <PartyPopper className="h-8 w-8 text-sauge flex-shrink-0" />
                <div>
                  <p className="font-semibold text-anthracite">
                    Félicitations ! Votre place est réservée.
                  </p>
                  <p className="text-sm text-anthracite/70">
                    Vous allez recevoir vos billets par email.
                  </p>
                </div>
              </div>
            )}

            <div>
              {isLoading ? (
                <div className="space-y-0">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-48 border-b border-sable bg-gray-50/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="p-12 text-center">
                  <Ticket className="h-14 w-14 mx-auto text-anthracite/30 mb-3" />
                  <h2 className="text-lg font-semibold text-anthracite mb-2">
                    Aucun événement
                  </h2>
                  <p className="text-anthracite/70 mb-4 text-sm">
                    Modifiez vos filtres ou déplacez la carte pour afficher les événements.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/evenements")}
                  >
                    Voir tous les événements
                  </Button>
                </div>
              ) : (
                events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isSelected={selectedEventId === event.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Carte à droite (55%) - fullscreen, collée aux bords, pas de rounded */}
          <div
            className="h-[400px] md:sticky md:top-28 md:h-[calc(100vh-8rem)] order-2 md:order-2"
            style={{ zIndex: 10, pointerEvents: "auto" }}
          >
            <EventsMap
              selectedEventId={selectedEventId || undefined}
              onEventSelect={scrollToEvent}
              onSearchInBounds={handleSearchInBounds}
              mapBounds={mapBounds || undefined}
              searchCity={searchCity || undefined}
              cityZoom={11}
              initialCenter={initialCenter}
              eventType={eventType || undefined}
              dateFrom={dateFrom || undefined}
              dateTo={dateTo || undefined}
              latitude={searchLat || undefined}
              longitude={searchLng || undefined}
              onMapReady={(flyToFn) => {
                mapFlyToRef.current = flyToFn;
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EvenementsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EvenementsPageContent />
    </Suspense>
  );
}
