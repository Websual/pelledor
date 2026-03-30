"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui";
import { Popover } from "@/components/popover";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Phone,
  Mail,
  Calendar,
  Clock,
  User,
  MessageSquare,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface Appointment {
  id: string;
  starts_at: string;
  status: "CONFIRMED" | "CANCELED" | "DONE";
  services: {
    id: string;
    name: string;
    duration_min: number;
    price_cents?: number;
  };
  users: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [popoverTrigger, setPopoverTrigger] = useState<HTMLElement | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientType, setClientType] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [newClient, setNewClient] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [selectedExternalEvent, setSelectedExternalEvent] = useState<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    location: string | null;
  } | null>(null);
  const queryClient = useQueryClient();

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Empêcher le scroll du body quand une modal est ouverte
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (selectedDay || selectedAppointment || showCreateModal || selectedExternalEvent) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    // Cleanup : réactiver le scroll quand le composant est démonté
    return () => {
      if (typeof window !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [selectedDay, selectedAppointment, showCreateModal, selectedExternalEvent]);

  // Calculate calendar days based on view mode
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments", format(currentDate, "yyyy-MM")],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
    enabled: !!session,
  });

  // Récupérer les événements externes (Google Calendar)
  const { data: externalEvents } = useQuery<Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    location: string | null;
  }>>({
    queryKey: ["externalEvents", format(currentDate, "yyyy-MM")],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/external-events");
      if (!res.ok) {
        if (res.status === 404 || res.status === 401) {
          return [];
        }
        throw new Error("Failed to fetch external events");
      }
      return res.json();
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });

  // Vérifier si le compte Google est lié
  const { data: googleAccountStatus } = useQuery<{ connected: boolean; email?: string }>({
    queryKey: ["googleAccountStatus"],
    queryFn: async () => {
      const res = await fetch("/api/user/google-account");
      if (!res.ok) {
        return { connected: false };
      }
      const data = await res.json();
      return { connected: true, email: data.email };
    },
    enabled: !!session,
  });

  // Mutation pour synchroniser Google Calendar
  const syncGoogleCalendar = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/practitioners/google-sync", {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync Google Calendar");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSyncMessage(data.message || "Agenda synchronisé avec Google");
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["externalEvents"] });
      queryClient.invalidateQueries({ queryKey: ["googleBusySlots"] });
      // Masquer le message après 3 secondes
      setTimeout(() => setSyncMessage(null), 3000);
    },
    onError: (error: Error) => {
      setSyncMessage(`Erreur : ${error.message}`);
      setTimeout(() => setSyncMessage(null), 5000);
    },
    onSettled: () => {
      setIsSyncing(false);
    },
  });

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    await syncGoogleCalendar.mutateAsync();
  };

  // Récupérer les créneaux occupés depuis Google Calendar
  const { data: googleBusySlots } = useQuery<{ busySlots: Array<{ start: string; end: string }> }>({
    queryKey: ["googleBusySlots", format(currentDate, "yyyy-MM")],
    queryFn: async () => {
      // Calculer la période à récupérer (mois en cours)
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const res = await fetch(
        `/api/calendar/google-busy-slots?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`
      );
      if (!res.ok) {
        // Si erreur (compte non lié, etc.), retourner un tableau vide
        if (res.status === 404 || res.status === 401) {
          return { busySlots: [] };
        }
        throw new Error("Failed to fetch Google Calendar busy slots");
      }
      return res.json();
    },
    enabled: !!session,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache pendant 5 minutes
  });

  // Fetch practitioner working hours for day view
  const { data: workingHours } = useQuery<Array<{day_of_week: number; start_time: string; end_time: string; is_active: boolean}>>({
    queryKey: ["workingHours"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/working-hours");
      if (!res.ok) throw new Error("Failed to fetch working hours");
      return res.json();
    },
    enabled: !!session && viewMode === "day",
  });

  // Fetch practitioner profile to get ID
  const { data: practitionerProfile } = useQuery<{ id: string }>({
    queryKey: ["practitionerProfile"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/profile");
      if (!res.ok) throw new Error("Failed to fetch practitioner profile");
      return res.json();
    },
    enabled: !!session && !!showCreateModal,
  });

  // Fetch services
  const { data: services } = useQuery<Array<{ id: string; name: string; duration_min: number; price_cents: number }>>({
    queryKey: ["services", practitionerProfile?.id],
    queryFn: async () => {
      if (!practitionerProfile?.id) throw new Error("Practitioner ID required");
      const res = await fetch(`/api/services?practitionerId=${practitionerProfile.id}`);
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
    enabled: !!session && !!showCreateModal && !!practitionerProfile?.id,
  });

  // Fetch existing clients
  const { data: clients } = useQuery<Array<{ id: string; name: string | null; email: string; phone: string | null }>>({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
    enabled: !!session && !!showCreateModal && clientType === "existing",
  });

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async (data: {
      serviceId: string;
      practitionerId: string;
      startsAt: Date;
      userId?: string;
      newClient?: { firstName: string; lastName: string; email: string; phone?: string };
    }) => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create appointment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["practitionerDashboard"] });
      setShowCreateModal(false);
      setCreateModalDate(null);
      setSelectedTime("");
      setClientType("existing");
      setSelectedClientId("");
      setNewClient({ firstName: "", lastName: "", email: "", phone: "" });
      setSelectedServiceId("");
    },
    onError: (error) => {
      console.error("Error creating appointment:", error);
    },
  });

  // Generate time slots for day view based on working hours
  const generateDayTimeSlots = (date: Date) => {
    if (!workingHours || workingHours.length === 0) return [];
    
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const hoursForDay = workingHours.filter(wh => wh.day_of_week === dayOfWeek && wh.is_active);
    
    if (hoursForDay.length === 0) return [];
    
    // Use a Set to track unique time slots by label
    const uniqueSlots = new Map<string, {hour: number; minute: number; label: string}>();
    
    for (const wh of hoursForDay) {
      const [startHour, startMin] = wh.start_time.split(":").map(Number);
      const [endHour, endMin] = wh.end_time.split(":").map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const label = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
        // Only add if not already in the map (avoid duplicates)
        if (!uniqueSlots.has(label)) {
          uniqueSlots.set(label, { hour: currentHour, minute: currentMin, label });
        }
        
        currentMin += 30;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour++;
        }
      }
    }
    
    // Convert map to array and sort by time
    return Array.from(uniqueSlots.values()).sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });
  };

  // Vérifier si un créneau est occupé dans Google Calendar
  const isGoogleBusySlot = (date: Date, hour: number, minute: number) => {
    if (!googleBusySlots?.busySlots || googleBusySlots.busySlots.length === 0) return false;
    
    const slotDate = new Date(date);
    slotDate.setHours(hour, minute, 0, 0);
    const slotEnd = new Date(slotDate);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30); // Créneaux de 30 min
    
    return googleBusySlots.busySlots.some((busySlot) => {
      const busyStart = new Date(busySlot.start);
      const busyEnd = new Date(busySlot.end);
      // Vérifier si le créneau chevauche avec un créneau occupé
      return (slotDate >= busyStart && slotDate < busyEnd) || 
             (slotEnd > busyStart && slotEnd <= busyEnd) ||
             (slotDate <= busyStart && slotEnd >= busyEnd);
    });
  };

  // Get appointment for a specific time slot
  const getAppointmentForTimeSlot = (date: Date, hour: number, minute: number) => {
    const dayAppointments = getAppointmentsForDay(date);
    return dayAppointments.find(appt => {
      const apptDate = new Date(appt.starts_at);
      return apptDate.getHours() === hour && apptDate.getMinutes() === minute;
    });
  };

  const getAppointmentsForDay = (date: Date) => {
    if (!appointments) return [];
    return appointments
      .filter((appointment) => {
        const appointmentDate = new Date(appointment.starts_at);
        return isSameDay(appointmentDate, date) && appointment.status === "CONFIRMED";
      })
      .sort((a, b) => {
        const timeA = new Date(a.starts_at).getTime();
        const timeB = new Date(b.starts_at).getTime();
        return timeA - timeB;
      });
  };

  // Récupérer les événements externes (Google Calendar) pour un jour donné
  const getExternalEventsForDay = (date: Date) => {
    if (!externalEvents) return [];
    return externalEvents
      .filter((event) => {
        const eventDate = new Date(event.starts_at);
        return isSameDay(eventDate, date);
      })
      .sort((a, b) => {
        const timeA = new Date(a.starts_at).getTime();
        const timeB = new Date(b.starts_at).getTime();
        return timeA - timeB;
      });
  };

  const navigatePrevious = () => {
    if (viewMode === "month") {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else if (viewMode === "week") {
      setCurrentDate((prev) => subWeeks(prev, 1));
    } else {
      setCurrentDate((prev) => subDays(prev, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else if (viewMode === "week") {
      setCurrentDate((prev) => addWeeks(prev, 1));
    } else {
      setCurrentDate((prev) => addDays(prev, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale: fr });
  };

  const handleDayClick = (day: Date, event: React.MouseEvent<HTMLDivElement>) => {
    setSelectedDay(day);
    setPopoverTrigger(event.currentTarget);
  };

  const closePopover = () => {
    setSelectedDay(null);
    setPopoverTrigger(null);
  };

  const getDisplayText = () => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy", { locale: fr });
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "d MMM", { locale: fr })} - ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
    } else {
      return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
    }
  };

  const isToday = (day: Date) => {
    return isSameDay(day, new Date());
  };

  const isPastDay = (day: Date) => {
    const today = startOfDay(new Date());
    const dayStart = startOfDay(day);
    return dayStart < today;
  };

  if (session.status === 'loading') return <Skeleton />

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f7f7f7" }}>
      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            {/* Month/Year Display */}
            <h1 className="text-4xl font-bold" style={{ color: "#2f2f2f" }}>
              {getDisplayText()}
            </h1>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={navigatePrevious}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/80"
                  style={{ backgroundColor: "#9bb49b", color: "white" }}
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={navigateNext}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/80"
                  style={{ backgroundColor: "#9bb49b", color: "white" }}
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ backgroundColor: "#e0e0e0" }}>
                {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      viewMode === mode
                        ? "bg-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    style={{
                      color: viewMode === mode ? "#2f2f2f" : undefined,
                    }}
                  >
                    {mode === "month" ? "Mois" : mode === "week" ? "Semaine" : "Jour"}
                  </button>
                ))}
              </div>

              {/* Bouton de synchronisation Google Calendar */}
              {googleAccountStatus?.connected ? (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isSyncing ? "#e0e0e0" : "#9bb49b",
                    color: "white",
                  }}
                  title="Synchroniser avec Google Calendar"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  <span>{isSyncing ? "Synchronisation..." : "Synchroniser"}</span>
                </button>
              ) : (
                <a
                  href="/pro/settings?tab=calendar"
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: "#9bb49b",
                    color: "white",
                  }}
                  title="Connecter Google Calendar"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Connecter Google</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Toast de synchronisation */}
        {syncMessage && (
          <div
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium"
            style={{
              backgroundColor: syncMessage.includes("Erreur") ? "#fee2e2" : "#d1fae5",
              color: syncMessage.includes("Erreur") ? "#dc2626" : "#065f46",
              border: `1px solid ${syncMessage.includes("Erreur") ? "#fecaca" : "#a7f3d0"}`,
            }}
          >
            {syncMessage}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48 mx-auto" />
            <div className="grid grid-cols-7 gap-3 mb-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Day Headers (only for month and week views) */}
            {(viewMode === "month" || viewMode === "week") && (
              <div className="grid grid-cols-7 gap-3 mb-3">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((dayName) => (
                  <div
                    key={dayName}
                    className="text-center font-semibold py-2"
                    style={{ color: "#2f2f2f" }}
                  >
                    {dayName}
                  </div>
                ))}
              </div>
            )}

            {/* Day View - Detailed Calendar */}
            {viewMode === "day" ? (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-6" style={{ color: "#2f2f2f" }}>
                  {format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}
                </h2>
                <div className="space-y-2">
                  {generateDayTimeSlots(currentDate).map((slot) => {
                    const appointment = getAppointmentForTimeSlot(currentDate, slot.hour, slot.minute);
                    const isGoogleBusy = isGoogleBusySlot(currentDate, slot.hour, slot.minute);
                    // Vérifier si un événement externe chevauche ce créneau
                    const externalEvent = externalEvents?.find((event) => {
                      const eventStart = new Date(event.starts_at);
                      const eventEnd = new Date(event.ends_at);
                      const slotStart = new Date(currentDate);
                      slotStart.setHours(slot.hour, slot.minute, 0, 0);
                      const slotEnd = new Date(slotStart);
                      slotEnd.setMinutes(slotEnd.getMinutes() + 30); // Durée par défaut d'un slot
                      return (
                        (slotStart >= eventStart && slotStart < eventEnd) ||
                        (slotEnd > eventStart && slotEnd <= eventEnd) ||
                        (slotStart <= eventStart && slotEnd >= eventEnd)
                      );
                    });
                    const slotDate = new Date(currentDate);
                    slotDate.setHours(slot.hour, slot.minute, 0, 0);
                    const isPast = new Date().getTime() > slotDate.getTime();
                    
                    return (
                      <div
                        key={slot.label}
                        className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md"
                        style={{
                          backgroundColor: appointment 
                            ? "rgba(155, 180, 155, 0.1)" 
                            : externalEvent
                            ? "rgb(248 250 252)" // bg-slate-50
                            : isGoogleBusy 
                            ? "rgba(128, 128, 128, 0.1)" 
                            : "white",
                          borderColor: appointment 
                            ? "#9bb49b" 
                            : externalEvent
                            ? "rgb(148 163 184)" // border-slate-400
                            : isGoogleBusy 
                            ? "#808080" 
                            : "#e0e0e0",
                          opacity: isPast ? 0.6 : 1,
                        }}
                        onClick={() => {
                          if (appointment) {
                            setSelectedAppointment(appointment);
                          } else if (externalEvent) {
                            setSelectedExternalEvent(externalEvent);
                          } else if (!isGoogleBusy) {
                            const slotDate = new Date(currentDate);
                            slotDate.setHours(slot.hour, slot.minute, 0, 0);
                            setCreateModalDate(slotDate);
                            // Pré-remplir l'heure en mode journalier
                            setSelectedTime(`${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`);
                            setShowCreateModal(true);
                          }
                        }}
                      >
                        <div className="w-20 text-sm font-medium" style={{ color: "#2f2f2f" }}>
                          {slot.label}
                        </div>
                        <div className="flex-1">
                          {appointment ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium" style={{ color: "#2f2f2f" }}>
                                  {appointment.users.name || appointment.users.email}
                                </div>
                                <div className="text-sm" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                                  {appointment.services.name} • {appointment.services.duration_min} min
                                </div>
                              </div>
                            </div>
                          ) : externalEvent ? (
                            <div
                              onClick={() => {
                                setSelectedExternalEvent(externalEvent);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="text-sm font-medium flex items-center gap-2" style={{ color: "rgb(148 163 184)" }}>
                                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{externalEvent.title}</span>
                              </div>
                              {externalEvent.location && (
                                <div className="text-xs mt-1" style={{ color: "rgb(148 163 184)", opacity: 0.7 }}>
                                  📍 {externalEvent.location}
                                </div>
                              )}
                            </div>
                          ) : isGoogleBusy ? (
                            <div className="text-sm" style={{ color: "#808080", fontStyle: "italic" }}>
                              Occupé (Google Calendar)
                            </div>
                          ) : (
                            <div className="text-sm" style={{ color: "#2f2f2f", opacity: 0.5 }}>
                              Disponible
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {generateDayTimeSlots(currentDate).length === 0 && (
                    <div className="text-center py-12">
                      <p style={{ color: "#2f2f2f", opacity: 0.6 }}>
                        Aucun horaire de travail défini pour ce jour
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Month/Week View - Calendar Grid */
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: "repeat(7, 1fr)",
                }}
              >
                {calendarDays.map((day) => {
                  const dayAppointments = getAppointmentsForDay(day);
                  const dayExternalEvents = getExternalEventsForDay(day);
                  const isCurrentMonth = viewMode === "month" ? isSameMonth(day, currentDate) : true;
                  const isTodayDate = isToday(day);
                  const isPast = isPastDay(day);

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={(e) => handleDayClick(day, e)}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className="relative bg-white rounded-2xl shadow-sm min-h-[120px] p-3 cursor-pointer transition-all hover:shadow-md"
                      style={{
                        opacity: isPast ? 0.6 : 1,
                      }}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`text-sm font-medium ${
                            isTodayDate
                              ? "w-7 h-7 rounded-full flex items-center justify-center text-white"
                              : ""
                          }`}
                          style={{
                            backgroundColor: isTodayDate ? "#9bb49b" : "transparent",
                            color: isTodayDate ? "white" : isCurrentMonth ? "#2f2f2f" : "#2f2f2f",
                            opacity: isCurrentMonth ? 1 : 0.4,
                          }}
                        >
                          {format(day, "d")}
                        </div>

                        {/* Hover Add Button */}
                        {hoveredDay && isSameDay(hoveredDay, day) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateModalDate(day);
                              setShowCreateModal(true);
                            }}
                            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-opacity-80"
                            style={{ backgroundColor: "#9bb49b", color: "white" }}
                            aria-label="Ajouter un rendez-vous"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Appointments et événements externes */}
                      <div className="space-y-1.5">
                        {/* Événements Holia (vert sauge) */}
                        {dayAppointments.slice(0, 3).map((appointment) => (
                          <div
                            key={appointment.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(appointment);
                            }}
                            className="text-xs px-2 py-1 rounded truncate cursor-pointer transition-colors hover:opacity-80"
                            style={{
                              backgroundColor: "rgba(155, 180, 155, 0.1)",
                              color: "#2f2f2f",
                              borderLeft: "2px solid #9bb49b",
                            }}
                            title={`${formatTime(appointment.starts_at)} - ${appointment.services.name} - ${appointment.users.name || appointment.users.email}`}
                          >
                            <div className="font-medium">
                              {formatTime(appointment.starts_at)} {appointment.users.name?.split(" ")[0] || appointment.users.email.split("@")[0]}
                            </div>
                          </div>
                        ))}
                        {/* Événements externes Google (style Ghost) */}
                        {dayExternalEvents.slice(0, Math.max(0, 3 - dayAppointments.length)).map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExternalEvent(event);
                            }}
                            className="text-xs px-2 py-1 rounded cursor-pointer transition-colors hover:opacity-80 flex items-center gap-1.5"
                            style={{
                              backgroundColor: "rgb(248 250 252)", // bg-slate-50
                              color: "rgb(148 163 184)", // text-slate-400
                              borderLeft: "2px solid rgb(148 163 184)", // border-slate-400
                            }}
                            title={`${formatTime(event.starts_at)} - ${event.title}${event.location ? ` - ${event.location}` : ""}`}
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" style={{ color: "rgb(148 163 184)" }} />
                            <span className="font-medium truncate flex-1 min-w-0">
                              {formatTime(event.starts_at)} {event.title}
                            </span>
                          </div>
                        ))}
                        {/* Compteur si plus de 3 événements au total */}
                        {(dayAppointments.length + dayExternalEvents.length) > 3 && (
                          <div
                            className="text-xs px-2 py-1 text-center rounded"
                            style={{
                              backgroundColor: dayAppointments.length > 3 
                                ? "rgba(155, 180, 155, 0.1)"
                                : "rgb(248 250 252)", // bg-slate-50
                              color: dayAppointments.length > 3 ? "#2f2f2f" : "rgb(148 163 184)", // text-slate-400
                            }}
                          >
                            +{(dayAppointments.length + dayExternalEvents.length) - 3} autre{(dayAppointments.length + dayExternalEvents.length) - 3 > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Popover for Day Details */}
        <Popover
          isOpen={!!selectedDay}
          trigger={popoverTrigger}
          onClose={closePopover}
          side="auto"
          align="center"
          offset={0}
        >
          {selectedDay && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-bold" style={{ color: "#2f2f2f" }}>
                  {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
                </h3>
              </div>
              <div className="space-y-2">
                {/* Événements Holia (vert sauge) */}
                {getAppointmentsForDay(selectedDay).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-3 rounded-2xl cursor-pointer transition-colors hover:opacity-80 mb-2"
                    style={{
                      backgroundColor: "rgba(155, 180, 155, 0.1)",
                      borderLeft: "2px solid #9bb49b",
                    }}
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      closePopover();
                    }}
                  >
                    <div className="font-medium text-sm" style={{ color: "#2f2f2f" }}>
                      {formatTime(appointment.starts_at)} - {appointment.services.name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                      {appointment.users.name || appointment.users.email}
                    </div>
                  </div>
                ))}
                {/* Événements externes Google (style Ghost) */}
                {getExternalEventsForDay(selectedDay).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedExternalEvent(event)}
                    className="p-3 rounded-2xl mb-2 cursor-pointer transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "rgb(248 250 252)", // bg-slate-50
                      borderLeft: "2px solid rgb(148 163 184)", // border-slate-400
                    }}
                  >
                    <div className="font-medium text-sm flex items-center gap-2" style={{ color: "rgb(148 163 184)" }}>
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{formatTime(event.starts_at)} - {event.title}</span>
                    </div>
                    {event.location && (
                      <div className="text-xs mt-1" style={{ color: "rgb(148 163 184)", opacity: 0.7 }}>
                        📍 {event.location}
                      </div>
                    )}
                  </div>
                ))}
                {getAppointmentsForDay(selectedDay).length === 0 && getExternalEventsForDay(selectedDay).length === 0 && (
                  <p className="text-sm" style={{ color: "#2f2f2f", opacity: 0.6 }}>
                    Aucun rendez-vous
                  </p>
                )}
              </div>
              <button
                onClick={closePopover}
                className="mt-4 w-full py-2 rounded-2xl text-sm font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: "#9bb49b", color: "white" }}
              >
                Fermer
              </button>
            </>
          )}
        </Popover>

        {/* Modal for Appointment Details */}
        {selectedAppointment && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => {
                setSelectedAppointment(null);
              }}
            >
              <div
                className={`bg-white rounded-2xl shadow-xl p-6 ${
                  isMobile ? "w-full max-h-[90vh] overflow-y-auto" : "max-w-lg w-full"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold" style={{ color: "#2f2f2f" }}>
                    Détails du rendez-vous
                  </h3>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" style={{ color: "#2f2f2f" }} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5" style={{ color: "#9bb49b" }} />
                      <span className="font-semibold" style={{ color: "#2f2f2f" }}>Client</span>
                    </div>
                    <p style={{ color: "#2f2f2f" }}>
                      {selectedAppointment.users.name || selectedAppointment.users.email}
                    </p>
                    {selectedAppointment.users.phone && (
                      <p className="text-sm mt-1" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                        <Phone className="h-4 w-4 inline mr-1" />
                        {selectedAppointment.users.phone}
                      </p>
                    )}
                    <p className="text-sm mt-1" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                      <Mail className="h-4 w-4 inline mr-1" />
                      {selectedAppointment.users.email}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5" style={{ color: "#9bb49b" }} />
                      <span className="font-semibold" style={{ color: "#2f2f2f" }}>Date et heure</span>
                    </div>
                    <p style={{ color: "#2f2f2f" }}>
                      {format(new Date(selectedAppointment.starts_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5" style={{ color: "#9bb49b" }} />
                      <span className="font-semibold" style={{ color: "#2f2f2f" }}>Service</span>
                    </div>
                    <p style={{ color: "#2f2f2f" }}>
                      {selectedAppointment.services.name} • {selectedAppointment.services.duration_min} min
                    </p>
                    {selectedAppointment.services.price_cents && (
                      <p className="text-sm mt-1" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                        {(selectedAppointment.services.price_cents / 100).toFixed(2)}€
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t" style={{ borderColor: "#e0e0e0" }}>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          if (selectedAppointment) {
                            const appointmentId = selectedAppointment.id;
                            setSelectedAppointment(null);
                            router.push(`/pro/appointments/${appointmentId}`);
                          }
                        }}
                        className="flex-1 py-3 px-4 rounded-2xl text-sm font-medium transition-colors hover:opacity-80 flex items-center justify-center gap-2"
                        style={{ backgroundColor: "#9bb49b", color: "white" }}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Contacter le client
                      </button>
                      <button
                        onClick={() => {
                          if (selectedAppointment) {
                            const appointmentId = selectedAppointment.id;
                            setSelectedAppointment(null);
                            router.push(`/pro/appointments/${appointmentId}`);
                          }
                        }}
                        className="flex-1 py-3 px-4 rounded-2xl text-sm font-medium transition-colors hover:opacity-80 flex items-center justify-center gap-2 border"
                        style={{ borderColor: "#9bb49b", color: "#9bb49b" }}
                      >
                        <Calendar className="h-4 w-4" />
                        Gérer le rendez-vous
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal for External Event (Google Calendar) */}
        {selectedExternalEvent && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => {
                setSelectedExternalEvent(null);
              }}
            >
              <div
                className={`bg-white rounded-2xl shadow-xl p-6 ${
                  isMobile ? "w-full max-h-[90vh] overflow-y-auto" : "max-w-md w-full"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-6 w-6" style={{ color: "rgb(148 163 184)" }} />
                    <h3 className="text-xl font-bold" style={{ color: "#2f2f2f" }}>
                      Événement Google Calendar
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedExternalEvent(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" style={{ color: "#2f2f2f" }} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: "rgb(248 250 252)" }}>
                    <p className="text-sm" style={{ color: "rgb(148 163 184)" }}>
                      Cet événement provient de votre agenda Google et bloque ce créneau sur Holia.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5" style={{ color: "rgb(148 163 184)" }} />
                      <span className="font-semibold text-sm" style={{ color: "#2f2f2f" }}>Titre</span>
                    </div>
                    <p className="text-sm" style={{ color: "#2f2f2f" }}>
                      {selectedExternalEvent.title}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5" style={{ color: "rgb(148 163 184)" }} />
                      <span className="font-semibold text-sm" style={{ color: "#2f2f2f" }}>Date et heure</span>
                    </div>
                    <p className="text-sm" style={{ color: "#2f2f2f" }}>
                      {format(new Date(selectedExternalEvent.starts_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      {selectedExternalEvent.ends_at && (
                        <> - {format(new Date(selectedExternalEvent.ends_at), "HH:mm", { locale: fr })}</>
                      )}
                    </p>
                  </div>

                  {selectedExternalEvent.location && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5" style={{ color: "rgb(148 163 184)" }} />
                        <span className="font-semibold text-sm" style={{ color: "#2f2f2f" }}>Lieu</span>
                      </div>
                      <p className="text-sm" style={{ color: "#2f2f2f" }}>
                        {selectedExternalEvent.location}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t" style={{ borderColor: "#e0e0e0" }}>
                    <button
                      onClick={() => setSelectedExternalEvent(null)}
                      className="w-full py-3 px-4 rounded-2xl text-sm font-medium transition-colors hover:opacity-80"
                      style={{ backgroundColor: "rgb(148 163 184)", color: "white" }}
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal for Create Appointment */}
        {showCreateModal && createModalDate && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => {
                setShowCreateModal(false);
                setCreateModalDate(null);
                setSelectedTime("");
              }}
            >
              <div
                className={`bg-white rounded-2xl shadow-xl p-6 ${
                  isMobile ? "w-full max-h-[90vh] overflow-y-auto" : "max-w-lg w-full my-8"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold" style={{ color: "#2f2f2f" }}>
                    Nouveau rendez-vous
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateModalDate(null);
                      setSelectedTime("");
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" style={{ color: "#2f2f2f" }} />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!practitionerProfile?.id || !selectedServiceId) return;
                    
                    const appointmentDate = new Date(createModalDate);
                    if (selectedTime) {
                      const [hours, minutes] = selectedTime.split(":").map(Number);
                      appointmentDate.setHours(hours, minutes, 0, 0);
                    }

                    createAppointment.mutate({
                      serviceId: selectedServiceId,
                      practitionerId: practitionerProfile.id,
                      startsAt: appointmentDate,
                      ...(clientType === "existing" && selectedClientId
                        ? { userId: selectedClientId }
                        : clientType === "new"
                        ? {
                            newClient: {
                              firstName: newClient.firstName,
                              lastName: newClient.lastName,
                              email: newClient.email,
                              phone: newClient.phone || undefined,
                            },
                          }
                        : {}),
                    });
                  }}
                  className="space-y-6"
                >
                  {/* Date and Time */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "#2f2f2f" }}>
                      Date
                    </label>
                    <p className="text-sm" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                      {format(createModalDate, "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "#2f2f2f" }}>
                      Heure *
                    </label>
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      required
                      className="w-full px-4 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sauge"
                      style={{ borderColor: "#e0e0e0" }}
                    />
                  </div>

                  {/* Service Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "#2f2f2f" }}>
                      Service *
                    </label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      required
                      className="w-full px-4 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sauge"
                      style={{ borderColor: "#e0e0e0" }}
                    >
                      <option value="">Sélectionner un service</option>
                      {services?.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - {service.duration_min} min - {(service.price_cents / 100).toFixed(2)}€
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Client Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "#2f2f2f" }}>
                      Client
                    </label>
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setClientType("existing")}
                        className={`flex-1 py-2 px-4 rounded-2xl text-sm font-medium transition-colors ${
                          clientType === "existing"
                            ? "text-white"
                            : "border"
                        }`}
                        style={
                          clientType === "existing"
                            ? { backgroundColor: "#9bb49b" }
                            : { borderColor: "#9bb49b", color: "#9bb49b" }
                        }
                      >
                        Client existant
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientType("new")}
                        className={`flex-1 py-2 px-4 rounded-2xl text-sm font-medium transition-colors ${
                          clientType === "new"
                            ? "text-white"
                            : "border"
                        }`}
                        style={
                          clientType === "new"
                            ? { backgroundColor: "#9bb49b" }
                            : { borderColor: "#9bb49b", color: "#9bb49b" }
                        }
                      >
                        Nouveau client
                      </button>
                    </div>

                    {clientType === "existing" ? (
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        required
                        className="w-full px-4 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sauge"
                        style={{ borderColor: "#e0e0e0" }}
                      >
                        <option value="">Sélectionner un client</option>
                        {clients?.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name || client.email} {client.phone ? `(${client.phone})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                              Prénom *
                            </label>
                            <input
                              type="text"
                              value={newClient.firstName}
                              onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                              required
                              className="w-full px-3 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sauge text-sm"
                              style={{ borderColor: "#e0e0e0" }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                              Nom *
                            </label>
                            <input
                              type="text"
                              value={newClient.lastName}
                              onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                              required
                              className="w-full px-3 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sauge text-sm"
                              style={{ borderColor: "#e0e0e0" }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                            Email *
                          </label>
                          <input
                            type="email"
                            value={newClient.email}
                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                            required
                            className="w-full px-3 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sauge text-sm"
                            style={{ borderColor: "#e0e0e0" }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "#2f2f2f", opacity: 0.7 }}>
                            Téléphone
                          </label>
                          <input
                            type="tel"
                            value={newClient.phone}
                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                            className="w-full px-3 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sauge text-sm"
                            style={{ borderColor: "#e0e0e0" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Message */}
                  {createAppointment.isError && (
                    <div className="p-3 rounded-2xl text-sm" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
                      {createAppointment.error instanceof Error
                        ? createAppointment.error.message
                        : "Erreur lors de la création du rendez-vous"}
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "#e0e0e0" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateModalDate(null);
                        setSelectedTime("");
                      }}
                      className="flex-1 py-3 px-4 rounded-2xl text-sm font-medium transition-colors border"
                      style={{ borderColor: "#e0e0e0", color: "#2f2f2f" }}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={createAppointment.isPending || !selectedTime || !selectedServiceId || (clientType === "existing" && !selectedClientId) || (clientType === "new" && (!newClient.firstName || !newClient.lastName || !newClient.email))}
                      className="flex-1 py-3 px-4 rounded-2xl text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#9bb49b", color: "white" }}
                    >
                      {createAppointment.isPending ? "Création..." : "Créer le rendez-vous"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
