"use client";

export const dynamic = 'force-dynamic';

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Heart,
  Search,
  User,
  Video,
  ExternalLink,
  Building2,
  DoorOpen,
  CalendarPlus,
  ChevronDown,
  Sparkles,
  Timer,
  CheckCircle2,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";

interface Appointment {
  id: string;
  startsAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "DONE";
  locationChoice: "PRESENTIAL" | "VIDEO" | null;
  service: {
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
    locationType?: "IN_PERSON" | "VIDEO" | "HYBRID" | null;
  };
  practitioner: {
    id: string;
    title: string;
    locationCity: string;
    address?: string | null;
    accessInfo?: string | null;
    photoUrl?: string | null;
    slug?: string;
    videoLink?: string | null;
  };
}

interface Practitioner {
  id: string;
  title: string;
  locationCity: string;
  photoUrl?: string | null;
  slug?: string;
}

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

// Fonctions utilitaires pour générer les liens calendrier
function generateGoogleCalendarUrl(appointment: Appointment): string {
  const startDate = new Date(appointment.startsAt);
  const endDate = new Date(startDate.getTime() + appointment.service.durationMin * 60000);
  
  // Format: YYYYMMDDTHHMMSSZ
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };
  
  const practitioner = appointment.practitioner;
  const isVideo = appointment.locationChoice === "VIDEO" || 
    (appointment.service.locationType === "VIDEO" && !appointment.locationChoice);
  
  const title = `${appointment.service.name} - ${practitioner.title}`;
  const location = isVideo ? "Téléconsultation" : (practitioner.address || practitioner.locationCity || "");
  
  let description = `Rendez-vous Holia avec ${practitioner.title}\n`;
  description += `Séance : ${appointment.service.name} (${appointment.service.durationMin} min)\n\n`;
  
  if (isVideo && practitioner.videoLink) {
    description += `🔗 Lien de la visio : ${practitioner.videoLink}\n\n`;
  }
  
  if (practitioner.slug) {
    description += `👤 Voir le profil : ${window.location.origin}/praticien/${practitioner.slug}`;
  }
  
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: description,
    location: location,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function generateIcsFile(appointment: Appointment): void {
  const startDate = new Date(appointment.startsAt);
  const endDate = new Date(startDate.getTime() + appointment.service.durationMin * 60000);
  
  // Format: YYYYMMDDTHHMMSSZ
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };
  
  const practitioner = appointment.practitioner;
  const isVideo = appointment.locationChoice === "VIDEO" || 
    (appointment.service.locationType === "VIDEO" && !appointment.locationChoice);
  
  const title = `${appointment.service.name} - ${practitioner.title}`;
  const location = isVideo ? "Téléconsultation" : (practitioner.address || practitioner.locationCity || "");
  
  let description = `Rendez-vous Holia avec ${practitioner.title}\\n`;
  description += `Séance : ${appointment.service.name} (${appointment.service.durationMin} min)\\n\\n`;
  
  if (isVideo && practitioner.videoLink) {
    description += `Lien de la visio : ${practitioner.videoLink}\\n\\n`;
  }
  
  if (practitioner.slug) {
    description += `Voir le profil : ${window.location.origin}/praticien/${practitioner.slug}`;
  }
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Holia//Holia Booking//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rdv-holia-${format(startDate, "yyyy-MM-dd")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Composant pour la carte du prochain rendez-vous
function NextAppointmentCard({ appointment }: { appointment: Appointment }) {
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const calendarMenuRef = useRef<HTMLDivElement>(null);
  
  // Fermer le menu au clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarMenuRef.current && !calendarMenuRef.current.contains(event.target as Node)) {
        setShowCalendarMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Déterminer si c'est une téléconsultation
  const isVideo = appointment.locationChoice === "VIDEO" || 
    (appointment.service.locationType === "VIDEO" && !appointment.locationChoice);
  
  const practitioner = appointment.practitioner;
  const hasVideoLink = isVideo && practitioner.videoLink;
  
  return (
    <Card className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Section principale avec photo et infos */}
          <div className="flex-1">
            <div className="flex items-start gap-5">
              {/* Photo du praticien */}
              <Link href={practitioner.slug ? `/praticien/${practitioner.slug}` : "#"}>
                {practitioner.photoUrl ? (
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-gray-100 hover:border-[#9bb49b] transition-colors">
                    <Image
                      src={practitioner.photoUrl}
                      alt={practitioner.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center flex-shrink-0 border-2 border-gray-100">
                    <User className="h-10 w-10 text-[#9bb49b]" />
                  </div>
                )}
              </Link>

              {/* Informations du rendez-vous */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <Link 
                      href={practitioner.slug ? `/praticien/${practitioner.slug}` : "#"}
                      className="hover:underline"
                    >
                      <h3 className="text-xl font-semibold text-anthracite">
                        {practitioner.title}
                      </h3>
                    </Link>
                    <p className="text-anthracite/70 text-sm">
                      {appointment.service.name} • {appointment.service.durationMin} min
                    </p>
                  </div>
                  {/* Badge chrono */}
                  <div className="flex-shrink-0 px-3 py-1.5 bg-[#9bb49b]/10 rounded-full">
                    <span className="text-sm font-medium text-[#9bb49b]">
                      Dans {formatDistanceToNow(new Date(appointment.startsAt), {
                        addSuffix: false,
                        locale: fr,
                      })}
                    </span>
                  </div>
                </div>

                {/* Date et heure */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                  <div className="flex items-center gap-2 text-sm text-anthracite/70">
                    <Calendar className="h-4 w-4 text-[#9bb49b]" />
                    <span className="font-medium">
                      {format(new Date(appointment.startsAt), "EEEE d MMMM yyyy", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-anthracite/70">
                    <Clock className="h-4 w-4 text-[#9bb49b]" />
                    <span className="font-medium">
                      {format(new Date(appointment.startsAt), "HH:mm", { locale: fr })}
                    </span>
                  </div>
                </div>

                {/* Badge type de séance et localisation */}
                <div className="mt-4 space-y-3">
                  {isVideo ? (
                    <>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                        <Video className="h-4 w-4" />
                        Téléconsultation
                      </div>
                      {hasVideoLink && (
                        <div className="mt-3">
                          <a
                            href={practitioner.videoLink!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl font-medium transition-colors"
                          >
                            <Video className="h-5 w-5" />
                            Rejoindre la séance
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                        <Building2 className="h-4 w-4" />
                        Au cabinet
                      </div>
                      {/* Adresse complète - Lien Google Maps */}
                      {(practitioner.address || practitioner.locationCity) && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            [practitioner.address, practitioner.locationCity].filter(Boolean).join(' ')
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 text-sm text-anthracite/70 hover:text-[#9bb49b] transition-colors group"
                        >
                          <MapPin className="h-4 w-4 text-[#9bb49b] mt-0.5 flex-shrink-0" />
                          <div className="flex items-center gap-1.5">
                            <div>
                              {practitioner.address && (
                                <p className="font-medium">{practitioner.address}</p>
                              )}
                              {practitioner.locationCity && !practitioner.address?.includes(practitioner.locationCity) && (
                                <p>{practitioner.locationCity}</p>
                              )}
                            </div>
                            <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 flex-shrink-0" />
                          </div>
                        </a>
                      )}
                      {/* Informations d'accès */}
                      {practitioner.accessInfo && (
                        <div className="flex items-start gap-2 text-sm text-slate-500 italic">
                          <DoorOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p>{practitioner.accessInfo}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col gap-3 lg:w-48 flex-shrink-0">
            <Link href={`/account/appointments/${appointment.id}`} className="w-full">
              <Button className="w-full bg-[#9bb49b] hover:bg-[#8aa48a] text-white">
                Voir les détails
              </Button>
            </Link>
            
            {/* Bouton Ajouter au calendrier */}
            <div className="relative" ref={calendarMenuRef}>
              <Button
                variant="outline"
                className="w-full border-gray-200 hover:border-[#9bb49b] hover:text-[#9bb49b] flex items-center justify-center gap-2"
                onClick={() => setShowCalendarMenu(!showCalendarMenu)}
              >
                <CalendarPlus className="h-4 w-4" />
                Ajouter à l&apos;agenda
                <ChevronDown className={`h-4 w-4 transition-transform ${showCalendarMenu ? "rotate-180" : ""}`} />
              </Button>
              
              {/* Menu déroulant */}
              {showCalendarMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden z-10">
                  <a
                    href={generateGoogleCalendarUrl(appointment)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#9bb49b]/5 transition-colors text-sm text-anthracite"
                    onClick={() => setShowCalendarMenu(false)}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M18 3H6C4.34315 3 3 4.34315 3 6V18C3 19.6569 4.34315 21 6 21H18C19.6569 21 21 19.6569 21 18V6C21 4.34315 19.6569 3 18 3Z" stroke="#4285F4" strokeWidth="2"/>
                      <path d="M12 8V12L15 15" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M8 3V6" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M16 3V6" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Google Calendar
                  </a>
                  <button
                    onClick={() => {
                      generateIcsFile(appointment);
                      setShowCalendarMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#9bb49b]/5 transition-colors text-sm text-anthracite border-t border-gray-50"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M18 3H6C4.34315 3 3 4.34315 3 6V18C3 19.6569 4.34315 21 6 21H18C19.6569 21 21 19.6569 21 18V6C21 4.34315 19.6569 3 18 3Z" stroke="#0078D4" strokeWidth="2"/>
                      <path d="M3 9H21" stroke="#0078D4" strokeWidth="2"/>
                      <path d="M8 3V6" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M16 3V6" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M7 13H10" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M7 17H12" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    iCal / Outlook
                  </button>
                </div>
              )}
            </div>
            
            <Link href="/account/appointments" className="w-full">
              <Button variant="outline" className="w-full border-gray-200 hover:border-[#9bb49b] hover:text-[#9bb49b]">
                Tous mes RDV
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function eventImageSrc(url: string | null) {
  if (!url) return null;
  return url.startsWith("http") ? url : (typeof window !== "undefined" ? window.location.origin + url : url);
}

// Carte "Mon prochain événement"
function NextEventCard({ ticket }: { ticket: UserTicketItem }) {
  const e = ticket.event;
  const isVideo = e.locationType === "VIDEO_ONLY";
  const imageUrl = e.bannerUrl || (e.posterUrl && !e.posterUrl.toLowerCase().endsWith(".pdf") ? e.posterUrl : null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <Card className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <CardContent className="p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Link href={`/evenements/${e.slug}`} className="flex-shrink-0">
            {imageUrl ? (
              <div className="relative w-full sm:w-28 h-32 sm:h-28 rounded-2xl overflow-hidden border border-gray-100">
                <Image
                  src={eventImageSrc(imageUrl) || ""}
                  alt={e.title}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
            ) : (
              <div className="w-full sm:w-28 h-32 sm:h-28 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center">
                <Ticket className="h-10 w-10 text-[#9bb49b]" />
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/evenements/${e.slug}`} className="hover:underline">
              <h3 className="text-lg font-semibold text-anthracite">{e.title}</h3>
            </Link>
            {e.practitionerName && (
              <p className="text-sm text-anthracite/70 mt-0.5">{e.practitionerName}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-sm text-anthracite/70">
              <Calendar className="h-4 w-4 text-[#9bb49b]" />
              <span>
                {format(new Date(e.date), "EEEE d MMMM · HH:mm", { locale: fr })}
              </span>
            </div>
            {isVideo ? (
              <p className="mt-2 text-sm text-anthracite/70 flex items-center gap-2">
                <Video className="h-4 w-4 text-[#9bb49b]" />
                En visioconférence
              </p>
            ) : (
              (e.address || e.locationCity) && (
                <p className="mt-2 text-sm text-anthracite/70 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#9bb49b]" />
                  {e.address || e.locationCity}
                </p>
              )
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
          <Link href={`/evenements/${e.slug}`} className="w-full">
            <Button className="w-full bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl">
              Voir l&apos;événement
            </Button>
          </Link>
          {ticket.status === "confirmed" && (
            <a
              href={`${baseUrl}/api/tickets/${ticket.id}/receipt`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button variant="outline" className="w-full border-gray-200 hover:border-[#9bb49b] hover:text-[#9bb49b] rounded-xl">
                Télécharger mon billet
              </Button>
            </a>
          )}
          <Link href="/account/events" className="w-full">
            <Button variant="outline" className="w-full border-gray-200 hover:border-[#9bb49b] hover:text-[#9bb49b] rounded-xl">
              Tous mes événements
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserDashboardPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
    enabled: !!session,
  });

  const { data: userTickets = [] } = useQuery<UserTicketItem[]>({
    queryKey: ["userTickets"],
    queryFn: async () => {
      const res = await fetch("/api/user/tickets");
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
    enabled: !!session,
  });

  // Récupérer les praticiens consultés précédemment
  const { data: previousPractitioners } = useQuery<Practitioner[]>({
    queryKey: ["previousPractitioners"],
    queryFn: async () => {
      // Récupérer les praticiens des rendez-vous passés
      const pastAppointments = appointments?.filter((apt) => {
        const aptDate = new Date(apt.startsAt);
        return aptDate < new Date() && apt.status === "DONE";
      }) || [];
      
      // Extraire les praticiens uniques
      const uniquePractitioners = new Map<string, Practitioner>();
      pastAppointments.forEach((apt) => {
        if (apt.practitioner && !uniquePractitioners.has(apt.practitioner.id)) {
          uniquePractitioners.set(apt.practitioner.id, apt.practitioner);
        }
      });
      
      return Array.from(uniquePractitioners.values());
    },
    enabled: !!appointments,
  });

  // Statistiques bien-être (un seul appel API optimisé)
  const { data: wellnessStats } = useQuery<{
    completedSessions: number;
    totalWellnessMinutes: number;
    favoritesCount: number;
  }>({
    queryKey: ["wellnessStats"],
    queryFn: async () => {
      const res = await fetch("/api/user/wellness-stats");
      if (!res.ok) throw new Error("Failed to fetch wellness stats");
      return res.json();
    },
    enabled: !!session,
  });

  // Formatter le temps : "2h 15min" si > 60 min, sinon "45 min"
  const formatWellnessTime = (minutes: number): string => {
    if (minutes === 0) return "0 min";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  if (!session) {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  // Trouver le prochain rendez-vous
  const upcomingAppointments = appointments?.filter((apt) => {
    const aptDate = new Date(apt.startsAt);
    return aptDate >= new Date() && (apt.status === "CONFIRMED" || apt.status === "PENDING");
  }).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()) || [];

  const nextAppointment = upcomingAppointments[0];
  const now = new Date();
  const nextEventTicket = userTickets
    .filter((t) => new Date(t.event.date) >= now)
    .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime())[0];
  const userName = data?.user?.name || data?.user?.email?.split("@")[0] || "Utilisateur";

  if (session.status === 'loading') return <Skeleton />

  if (appointmentsLoading) {
    return <PageSkeleton />;
  }

  return (
    <main className="pb-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-heading text-anthracite mb-2">
            Bonjour {userName} 👋
          </h1>
          <p className="text-anthracite/70">
            Prête pour votre prochaine séance de bien-être ?
          </p>
        </div>

        {/* Prochain RDV – Section distincte */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-anthracite mb-4">
            Votre prochain rendez-vous
          </h2>
          {nextAppointment ? (
            <NextAppointmentCard appointment={nextAppointment} />
          ) : (
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-8 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-full bg-[#9bb49b]/10 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-10 w-10 text-[#9bb49b]" />
                  </div>
                  <h3 className="text-2xl font-semibold text-anthracite mb-2">
                    Prenez du temps pour vous
                  </h3>
                  <p className="text-anthracite/70 mb-6">
                    Découvrez nos praticiens certifiés et réservez votre prochaine séance de bien-être.
                  </p>
                  <Link href="/recherche">
                    <Button className="w-full md:w-auto bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl">
                      Rechercher un praticien
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Mon prochain événement – Section distincte */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-anthracite mb-4">
            Mon prochain événement
          </h2>
          {nextEventTicket ? (
            <NextEventCard ticket={nextEventTicket} />
          ) : (
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-8 text-center flex flex-col justify-center">
                <div className="w-20 h-20 rounded-full bg-[#9bb49b]/10 flex items-center justify-center mx-auto mb-4">
                  <Ticket className="h-10 w-10 text-[#9bb49b]" />
                </div>
                <h3 className="text-xl font-semibold text-anthracite mb-2">
                  Mon prochain événement
                </h3>
                <p className="text-anthracite/70 mb-6">
                  Ateliers, conférences et stages bien-être près de chez vous.
                </p>
                <Link href="/evenements">
                  <Button variant="outline" className="rounded-xl border-[#9bb49b] text-[#9bb49b] hover:bg-[#9bb49b]/10">
                    Découvrir les événements
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Section "Mon parcours bien-être" */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-anthracite">
            Mon parcours bien-être
          </h2>

          {/* Statistiques */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-[#9bb49b]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-anthracite">
                      {wellnessStats?.completedSessions ?? 0}
                    </p>
                    <p className="text-xs text-anthracite/60">
                      Séances
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link href="/account/favorites">
              <Card className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                      <Heart className="h-6 w-6 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-anthracite">
                        {wellnessStats?.favoritesCount ?? 0}
                      </p>
                      <p className="text-xs text-anthracite/60">
                        Favoris
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                    <Timer className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-anthracite">
                      {formatWellnessTime(wellnessStats?.totalWellnessMinutes ?? 0)}
                    </p>
                    <p className="text-xs text-anthracite/60">
                      Temps de soin
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Réserver à nouveau */}
          {previousPractitioners && previousPractitioners.length > 0 && (
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-anthracite mb-4">
                  Réserver à nouveau
                </h3>
                <div className="flex flex-wrap gap-4">
                  {previousPractitioners.slice(0, 3).map((practitioner) => (
                    <div
                      key={practitioner.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-[#9bb49b]/5 transition-colors"
                    >
                      {practitioner.photoUrl ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                          <Image
                            src={practitioner.photoUrl}
                            alt={practitioner.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#9bb49b]/10 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
                          <User className="h-6 w-6 text-[#9bb49b]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-anthracite truncate max-w-[120px]">
                          {practitioner.title}
                        </p>
                        <Link
                          href={practitioner.slug ? `/praticien/${practitioner.slug}` : `/recherche`}
                        >
                          <span className="text-sm text-[#9bb49b] hover:underline font-medium">
                            Prendre RDV
                          </span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Explorer de nouvelles approches */}
          <div className="bg-[#9bb49b]/5 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-[#9bb49b]/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-[#9bb49b]" />
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-anthracite">
                    Besoin d&apos;un autre conseil ?
                  </h3>
                  <p className="text-sm text-anthracite/60">
                    Sophrologie, naturopathie, hypnose et bien plus encore.
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Link href="/recherche">
                  <Button className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Découvrir
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

