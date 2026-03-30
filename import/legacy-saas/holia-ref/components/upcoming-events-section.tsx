"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Event {
  id: string;
  slug: string;
  title: string;
  event_type?: string;
  banner_url?: string | null;
  poster_url: string | null;
  date: string;
  price_cents: number;
  remaining_places: number;
  practitioner: { location_city: string } | null;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONFERENCE: "Conférence",
  ATELIER: "Atelier",
  STAGE: "Stage",
};

function formatPrice(cents: number) {
  if (cents === 0) return "Gratuit";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function posterSrc(url: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return typeof window !== "undefined" ? `${window.location.origin}${url}` : url;
}

export function UpcomingEventsSection() {
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["upcomingEvents", 3],
    queryFn: async () => {
      const res = await fetch("/api/events?limit=3");
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  if (isLoading || events.length === 0) return null;

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-anthracite mb-4">
            Les prochains événements bien-être
          </h2>
          <p className="text-lg text-anthracite/70 max-w-2xl mx-auto">
            Conférences, ateliers et stages près de chez vous. Réservez votre place en quelques clics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/evenements/${event.slug}`}
              className="group block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-sauge/30 transition-all duration-300"
            >
              <div className="relative aspect-[16/10] bg-gradient-to-br from-sauge/20 to-sauge/5">
                {(event.banner_url || (event.poster_url && !event.poster_url.toLowerCase().endsWith(".pdf"))) ? (
                  <Image
                    src={posterSrc(event.banner_url || event.poster_url) || ""}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized={(event.banner_url || event.poster_url)?.startsWith("/")}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Ticket className="h-20 w-20 text-sauge/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sauge text-white">
                    {EVENT_TYPE_LABELS[event.event_type || ""] || "Événement"}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 text-sauge">
                    {formatPrice(event.price_cents)}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white font-bold text-lg drop-shadow-lg line-clamp-2">
                    {event.title}
                  </p>
                  <p className="text-white/90 text-sm mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    {format(new Date(event.date), "EEEE d MMMM à HH:mm", { locale: fr })}
                  </p>
                  {event.practitioner?.location_city && (
                    <p className="text-white/90 text-sm flex items-center gap-2 mt-0.5">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {event.practitioner.location_city}
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-anthracite/60">
                  {event.remaining_places} place{event.remaining_places > 1 ? "s" : ""} disponible{event.remaining_places > 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/evenements"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sauge text-white font-medium hover:bg-sauge/90 transition-colors"
          >
            <Ticket className="h-4 w-4" />
            Voir tous les événements
          </Link>
        </div>
      </div>
    </section>
  );
}
