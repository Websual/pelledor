"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  MapPin,
  Video,
  Ticket,
  Download,
  ChevronRight,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import confetti from "canvas-confetti";

interface UserTicketItem {
  id: string;
  quantity: number;
  status: string;
  purchasedAt: string;
  event: {
    id: string;
    title: string;
    slug: string;
    date: string;
    address: string | null;
    locationType: string;
    bannerUrl: string | null;
    posterUrl: string | null;
    practitionerName: string | null;
    practitionerSlug: string | null;
    locationCity: string | null;
    practitionerAddress: string | null;
  };
}

function eventImageSrc(url: string | null) {
  if (!url) return null;
  return url.startsWith("http")
    ? url
    : (typeof window !== "undefined" ? window.location.origin + url : url);
}

function TicketCard({
  ticket,
  isPast,
}: {
  ticket: UserTicketItem;
  isPast: boolean;
}) {
  const e = ticket.event;
  const isVideo = e.locationType === "VIDEO_ONLY";
  const imageUrl =
    e.bannerUrl ||
    (e.posterUrl && !e.posterUrl.toLowerCase().endsWith(".pdf")
      ? e.posterUrl
      : null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const isConfirmed = ticket.status === "confirmed";

  return (
    <Card className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Affiche de l'événement */}
          <Link
            href={`/evenements/${e.slug}`}
            className="relative w-full sm:w-52 h-44 sm:h-auto sm:min-h-[200px] flex-shrink-0 bg-gray-100 rounded-t-3xl sm:rounded-l-3xl sm:rounded-tr-none overflow-hidden"
          >
            {imageUrl ? (
              <Image
                src={eventImageSrc(imageUrl) || ""}
                alt={e.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 208px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Ticket className="h-12 w-12 text-[#9bb49b]/50" />
              </div>
            )}
            {isPast && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/90 text-anthracite">
                  Passé
                </span>
              </div>
            )}
          </Link>

          <div className="flex-1 p-5 sm:p-6 flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <Link
                  href={`/evenements/${e.slug}`}
                  className="hover:underline font-semibold text-anthracite text-lg"
                >
                  {e.title}
                </Link>
                {e.practitionerName && (
                  <p className="text-sm text-anthracite/70 mt-0.5">
                    {e.practitionerSlug ? (
                      <Link
                        href={`/praticien/${e.practitionerSlug}`}
                        className="text-[#9bb49b] hover:underline font-medium"
                      >
                        {e.practitionerName}
                      </Link>
                    ) : (
                      e.practitionerName
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isConfirmed && !isPast && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#9bb49b]/15 text-[#9bb49b]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ticket validé
                  </span>
                )}
                {ticket.quantity > 1 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-anthracite/80">
                    × {ticket.quantity}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-anthracite/80">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#9bb49b] flex-shrink-0" />
                <span>
                  {format(new Date(e.date), "EEEE d MMMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </span>
              </div>
              {isVideo ? (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#9bb49b] flex-shrink-0" />
                  <span>En visioconférence</span>
                </div>
              ) : (
                (e.address || e.locationCity) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#9bb49b] flex-shrink-0" />
                    <span>{e.address || e.locationCity}</span>
                  </div>
                )
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <Link href={`/evenements/${e.slug}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-gray-200 hover:border-[#9bb49b] hover:text-[#9bb49b]"
                >
                  Détails de l&apos;événement
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              {isConfirmed && (
                <a
                  href={`${baseUrl}/api/tickets/${ticket.id}/receipt`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-[#9bb49b] text-[#9bb49b] hover:bg-[#9bb49b]/10"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Télécharger mon reçu PDF
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountEventsPage() {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get("payment") === "success";
  const [showSuccessBanner, setShowSuccessBanner] = useState(paymentSuccess);

  useEffect(() => {
    if (typeof document !== "undefined") document.title = "Mes événements | Holia";
  }, []);

  useEffect(() => {
    if (paymentSuccess && showSuccessBanner) {
      const runConfetti = () => {
        const count = 200;
        const defaults = { origin: { y: 0.7 }, zIndex: 9999 };
        const colors = ["#9bb49b", "#8aa48a", "#7a947a", "#c4e0c4"];
        function fire(particleRatio: number, opts: confetti.Options) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
            colors,
          });
        }
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      };
      const t = setTimeout(runConfetti, 300);
      const hideTimer = setTimeout(() => {
        setShowSuccessBanner(false);
        router.replace("/account/events", { scroll: false });
      }, 6000);
      return () => {
        clearTimeout(t);
        clearTimeout(hideTimer);
      };
    }
  }, [paymentSuccess, showSuccessBanner, router]);

  const { data: tickets = [], isLoading } = useQuery<UserTicketItem[]>({
    queryKey: ["userTickets"],
    queryFn: async () => {
      const res = await fetch("/api/user/tickets");
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
    enabled: !!session.data,
  });

  const now = new Date();
  const upcoming = tickets.filter(
    (t) => new Date(t.event.date) >= now
  ).sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
  const past = tickets
    .filter((t) => new Date(t.event.date) < now)
    .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime());

  if (!session.data) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  if (session.status === "loading") return <Skeleton />;

  return (
    <main className="pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Bannière succès payment=success */}
        {showSuccessBanner && (
          <div className="fixed top-0 left-0 right-0 z-[9998] bg-[#9bb49b] text-white shadow-lg">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
              <p className="text-sm sm:text-base font-medium">
                🎉 Votre place est réservée ! Retrouvez votre ticket ci-dessous.
              </p>
              <button
                onClick={() => {
                  setShowSuccessBanner(false);
                  router.replace("/account/events", { scroll: false });
                }}
                className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
        {showSuccessBanner && <div className="h-14 flex-shrink-0" />}

        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
            Mes événements
          </h1>
          <p className="text-anthracite/70">
            Vos billets pour les ateliers, conférences et stages.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-48 rounded-3xl bg-gray-100 animate-pulse" />
            <div className="h-48 rounded-3xl bg-gray-100 animate-pulse" />
          </div>
        ) : tickets.length === 0 ? (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardContent className="py-16 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-[#9bb49b]/10 flex items-center justify-center mx-auto mb-4">
                <Ticket className="h-10 w-10 text-[#9bb49b]" />
              </div>
              <h2 className="text-xl font-semibold text-anthracite mb-2">
                Aucun billet pour le moment
              </h2>
              <p className="text-anthracite/70 mb-6 max-w-sm mx-auto">
                Découvrez les ateliers, conférences et stages bien-être et réservez votre place.
              </p>
              <Button asChild className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl">
                <Link href="/evenements">Voir les événements</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-anthracite mb-4">
                  À venir
                </h2>
                <div className="space-y-4">
                  {upcoming.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      isPast={false}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-anthracite mb-4">
                  Historique
                </h2>
                <div className="space-y-4">
                  {past.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      isPast
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
