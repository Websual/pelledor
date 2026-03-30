"use client";

export const dynamic = 'force-dynamic';

import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, MapPin, CheckCircle, XCircle, MessageSquare, ExternalLink, Star, RotateCcw, Search, Flower2, Info } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ChatThread } from "@/components/chat-thread";

// Composant Empty State zen
function EmptyState({
  icon,
  title,
  subtitle,
  showExploreButton = true,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  showExploreButton?: boolean;
}) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-24 h-24 rounded-full bg-[#9bb49b]/5 flex items-center justify-center mx-auto mb-6 ring-4 ring-[#9bb49b]/10">
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-anthracite mb-2">
        {title}
      </h2>
      <p className="text-anthracite/60 mb-6 max-w-sm mx-auto">
        {subtitle}
      </p>
      {showExploreButton && (
        <Button asChild className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white">
          <Link href="/recherche">Explorer les praticiens</Link>
        </Button>
      )}
    </div>
  );
}

interface Appointment {
  id: string;
  startsAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "DONE";
  service: {
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
  } | null;
  practitioner: {
    id: string;
    title: string;
    locationCity: string;
    address: string | null;
    accessInfo: string | null;
    locationLat: number | null;
    locationLng: number | null;
    photoUrl: string | null;
    slug: string | null;
    professionName: string | null;
  } | null;
  unreadMessagesFromPractitioner?: number;
  review: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
}

export default function AppointmentsPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get("payment") === "success";
  const [showSuccess, setShowSuccess] = useState(paymentSuccess);
  const [openChat, setOpenChat] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"upcoming" | "history" | "canceled">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  const handleBookAgain = (appointment: Appointment) => {
    if (!appointment.practitioner?.slug) return;
    router.push(`/praticien/${appointment.practitioner.slug}`);
  };

  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
    enabled: !!session,
  });

  // Cancel appointment mutation
  const cancelAppointment = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel appointment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
  });

  // Confetti effect
  useEffect(() => {
    if (showSuccess) {
      // Simple confetti effect using CSS animations
      const timer = setTimeout(() => {
        setShowSuccess(false);
        // Remove payment param from URL
        router.replace("/account/appointments", { scroll: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, router]);

  // Filtrer par recherche (nom praticien ou type de soin)
  const matchesSearch = (apt: Appointment, query: string): boolean => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    const practitionerName = apt.practitioner?.title?.toLowerCase() || "";
    const professionName = apt.practitioner?.professionName?.toLowerCase() || "";
    const serviceName = apt.service?.name?.toLowerCase() || "";
    return practitionerName.includes(q) || professionName.includes(q) || serviceName.includes(q);
  };

  // Appointments par onglet + recherche
  const tabbedAppointments = useMemo(() => {
    if (!appointments) return { upcoming: [], history: [], canceled: [] };
    const now = new Date();
    
    const upcoming = appointments
      .filter(apt => 
        (apt.status === "CONFIRMED" || apt.status === "PENDING") &&
        new Date(apt.startsAt) >= now &&
        matchesSearch(apt, searchQuery)
      )
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    
    const history = appointments
      .filter(apt => apt.status === "DONE" && matchesSearch(apt, searchQuery))
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    
    const canceled = appointments
      .filter(apt => apt.status === "CANCELED" && matchesSearch(apt, searchQuery))
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    
    return { upcoming, history, canceled };
  }, [appointments, searchQuery]);

  if (!session) {
    if (typeof window !== "undefined") {
      router.push("/connexion");
    }
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-anthracite/70">Redirection...</p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-3xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2) + "€";
  };

  const getStatusBadge = (status: Appointment["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
            En attente
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#9bb49b]/10 text-[#9bb49b] border border-[#9bb49b]/20">
            Confirmé
          </span>
        );
      case "CANCELED":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            Annulé
          </span>
        );
      case "DONE":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            Terminé
          </span>
        );
      default:
        return null;
    }
  };

  const getGoogleMapsUrl = (practitioner: Appointment["practitioner"]) => {
    if (!practitioner) return null;
    const address = [practitioner.address, practitioner.locationCity].filter(Boolean).join(" ");
    if (!address) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const renderAppointmentCard = (appointment: Appointment, isHistory: boolean = false) => {
    const isPast = new Date(appointment.startsAt) < new Date();
    const googleMapsUrl = getGoogleMapsUrl(appointment.practitioner);

    return (
      <Card
        key={appointment.id}
        className={`bg-white rounded-3xl shadow-sm border border-gray-100 ${
          isHistory ? "opacity-75" : ""
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Photo du praticien */}
            {appointment.practitioner?.photoUrl && (
              <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100">
                <Image
                  src={appointment.practitioner.photoUrl}
                  alt={appointment.practitioner.title || "Praticien"}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            {!appointment.practitioner?.photoUrl && (
              <div className="w-16 h-16 rounded-full bg-[#9bb49b]/10 flex items-center justify-center flex-shrink-0 border-2 border-gray-100">
                <span className="text-2xl font-semibold text-[#9bb49b]">
                  {appointment.practitioner?.title?.charAt(0) || "P"}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* En-tête avec titre et statut */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-anthracite mb-1">
                    {appointment.service?.name || "Service non disponible"}
                  </h3>
                  {appointment.practitioner && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={appointment.practitioner.slug ? `/praticien/${appointment.practitioner.slug}` : "#"}
                        className="text-sm font-medium text-[#9bb49b] hover:underline"
                      >
                        {appointment.practitioner.title}
                      </Link>
                      {appointment.practitioner.professionName && (
                        <>
                          <span className="text-anthracite/40">•</span>
                          <span className="text-sm text-anthracite/60">
                            {appointment.practitioner.professionName}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {getStatusBadge(appointment.status)}
              </div>

              {/* Informations du rendez-vous */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-anthracite/70">
                  <Calendar className="h-4 w-4 text-[#9bb49b]" />
                  <span>
                    {format(new Date(appointment.startsAt), "EEEE d MMMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-anthracite/70">
                  <Clock className="h-4 w-4 text-[#9bb49b]" />
                  <span>
                    {format(new Date(appointment.startsAt), "HH:mm", { locale: fr })} •{" "}
                    {appointment.service?.durationMin || 0} minutes
                  </span>
                </div>
                {appointment.service && (
                  <div className="flex items-center gap-2 text-sm text-anthracite/70">
                    <span className="font-semibold text-anthracite">
                      {formatPrice(appointment.service.priceCents)}
                    </span>
                  </div>
                )}
                {appointment.practitioner && googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-anthracite/70 hover:text-[#9bb49b] transition-colors group"
                  >
                    <MapPin className="h-4 w-4 text-[#9bb49b] flex-shrink-0" />
                    <span>
                      {appointment.practitioner.address
                        ? `${appointment.practitioner.address}, ${appointment.practitioner.locationCity}`
                        : appointment.practitioner.locationCity}
                    </span>
                    <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 flex-shrink-0" />
                  </a>
                )}
                {/* Infos d'accès (digicode, étage) - uniquement pour RDV à venir */}
                {!isHistory && !isPast && appointment.practitioner?.accessInfo && (
                  <div className="flex items-start gap-2 text-sm text-slate-500 italic">
                    <Info className="h-4 w-4 text-[#9bb49b] mt-0.5 flex-shrink-0" />
                    <span>{appointment.practitioner.accessInfo}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-gray-100">
                {appointment.status === "CONFIRMED" && !isPast && (() => {
                  // Vérifier si le rendez-vous est dans moins de 24h
                  const appointmentDate = new Date(appointment.startsAt);
                  const now = new Date();
                  const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                  const canCancel = hoursUntilAppointment >= 24;
                  
                  return canCancel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            "Êtes-vous sûr de vouloir annuler cette réservation ?"
                          )
                        ) {
                          cancelAppointment.mutate(appointment.id);
                        }
                      }}
                      disabled={cancelAppointment.isPending}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-anthracite/60">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="border-gray-300 text-gray-400 cursor-not-allowed"
                        title="Annulation impossible moins de 24h avant la séance"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                      <span className="text-xs text-anthracite/50">
                        Annulation impossible moins de 24h avant la séance
                      </span>
                    </div>
                  );
                })()}
                {appointment.status === "DONE" && !appointment.review && (
                  <Button
                    size="sm"
                    asChild
                    className="bg-[#9bb49b] hover:bg-[#9bb49b]/90"
                  >
                    <Link href={`/account/reviews/new?practitionerId=${appointment.practitioner?.slug || appointment.practitioner?.id}`}>
                      <Star className="h-4 w-4 mr-2" />
                      Laisser un avis
                    </Link>
                  </Button>
                )}
                {appointment.status === "DONE" && appointment.review && (
                  <span className="text-sm text-anthracite/60 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    Avis laissé ({appointment.review.rating}/5)
                  </span>
                )}
                {/* Bouton "Réserver à nouveau" pour les séances passées */}
                {isPast && appointment.practitioner?.slug && (
                  <Button
                    size="sm"
                    onClick={() => handleBookAgain(appointment)}
                    className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Réserver à nouveau
                  </Button>
                )}
                {(appointment.status === "CONFIRMED" || appointment.status === "PENDING") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const willOpen = !openChat[appointment.id];
                      setOpenChat((prev) => ({ ...prev, [appointment.id]: willOpen }));
                      if (willOpen && (appointment.unreadMessagesFromPractitioner ?? 0) > 0) {
                        try {
                          await fetch(`/api/appointments/${appointment.id}/messages/mark-read`, {
                            method: "POST",
                          });
                          queryClient.invalidateQueries({ queryKey: ["appointments"] });
                        } catch {
                          // Ignore
                        }
                      }
                    }}
                    className="border-[#9bb49b]/20 text-[#9bb49b] hover:bg-[#9bb49b]/5 relative"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {openChat[appointment.id] ? "Fermer le chat" : "Ouvrir le chat"}
                    {(appointment.unreadMessagesFromPractitioner ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#9bb49b] px-1 text-[10px] font-medium text-white">
                        {appointment.unreadMessagesFromPractitioner > 9 ? "9+" : appointment.unreadMessagesFromPractitioner}
                      </span>
                    )}
                  </Button>
                )}
              </div>

              {/* Chat moderne */}
              {openChat[appointment.id] && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <ChatThread appointmentId={appointment.id} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (session.status === 'loading') return <Skeleton />

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold font-heading text-anthracite mb-6">
          Mes réservations
        </h1>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === "upcoming"
                ? "bg-[#9bb49b] text-white"
                : "bg-gray-100 text-anthracite/70 hover:bg-gray-200"
            }`}
          >
            À venir
            {tabbedAppointments.upcoming.length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-2xl text-xs ${
                activeTab === "upcoming" ? "bg-white/20" : "bg-gray-200"
              }`}>
                {tabbedAppointments.upcoming.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === "history"
                ? "bg-[#9bb49b] text-white"
                : "bg-gray-100 text-anthracite/70 hover:bg-gray-200"
            }`}
          >
            Historique
            {tabbedAppointments.history.length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-2xl text-xs ${
                activeTab === "history" ? "bg-white/20" : "bg-gray-200"
              }`}>
                {tabbedAppointments.history.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("canceled")}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === "canceled"
                ? "bg-[#9bb49b] text-white"
                : "bg-gray-100 text-anthracite/70 hover:bg-gray-200"
            }`}
          >
            Annulés
            {tabbedAppointments.canceled.length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-2xl text-xs ${
                activeTab === "canceled" ? "bg-white/20" : "bg-gray-200"
              }`}>
                {tabbedAppointments.canceled.length}
              </span>
            )}
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-anthracite/40" />
          <input
            type="text"
            placeholder="Rechercher par praticien ou type de soin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-anthracite placeholder:text-anthracite/40 focus:outline-none focus:ring-2 focus:ring-[#9bb49b]/20 focus:border-[#9bb49b]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-anthracite/40 hover:text-anthracite"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Bannière de succès avec confettis */}
        {showSuccess && (
          <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#9bb49b]/10 to-[#9bb49b]/5 border-2 border-[#9bb49b]/20 p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Confettis animés */}
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    backgroundColor: ['#9bb49b', '#fbbf24', '#f59e0b', '#10b981'][Math.floor(Math.random() * 4)],
                  }}
                />
              ))}
            </div>
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#9bb49b] flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-anthracite mb-1">
                  Votre rendez-vous est confirmé !
                </h2>
                <p className="text-sm text-anthracite/70">
                  Vous recevrez un email de confirmation avec tous les détails.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contenu des onglets */}
        {activeTab === "upcoming" && (
          <>
            {tabbedAppointments.upcoming.length > 0 ? (
              <div className="space-y-4">
                {tabbedAppointments.upcoming.map((appointment) =>
                  renderAppointmentCard(appointment, false)
                )}
              </div>
            ) : (
              <EmptyState
                icon={<Calendar className="h-12 w-12 text-[#9bb49b]" />}
                title={searchQuery ? "Aucun résultat pour votre recherche" : "Vous n'avez pas de séances prévues"}
                subtitle={searchQuery ? "Essayez un autre terme ou effacez la recherche." : "Prenez du temps pour vous et réservez une séance de bien-être."}
                showExploreButton={!searchQuery}
              />
            )}
          </>
        )}

        {activeTab === "history" && (
          <>
            {tabbedAppointments.history.length > 0 ? (
              <div className="space-y-4">
                {tabbedAppointments.history.map((appointment) =>
                  renderAppointmentCard(appointment, true)
                )}
              </div>
            ) : (
              <EmptyState
                icon={<Flower2 className="h-12 w-12 text-[#9bb49b]" />}
                title={searchQuery ? "Aucun résultat pour votre recherche" : "Aucun historique pour le moment"}
                subtitle={searchQuery ? "Essayez un autre terme ou effacez la recherche." : "Vos séances réalisées apparaîtront ici."}
                showExploreButton={!searchQuery}
              />
            )}
          </>
        )}

        {activeTab === "canceled" && (
          <>
            {tabbedAppointments.canceled.length > 0 ? (
              <div className="space-y-4">
                {tabbedAppointments.canceled.map((appointment) =>
                  renderAppointmentCard(appointment, true)
                )}
              </div>
            ) : (
              <EmptyState
                icon={<Flower2 className="h-12 w-12 text-[#9bb49b]" />}
                title={searchQuery ? "Aucun résultat pour votre recherche" : "Aucun rendez-vous annulé"}
                subtitle={searchQuery ? "Essayez un autre terme ou effacez la recherche." : "Vos annulations apparaîtront ici."}
                showExploreButton={!searchQuery}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
