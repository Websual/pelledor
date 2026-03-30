"use client";


import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { Clock, Euro, ChevronLeft, ChevronRight, X, CalendarDays, Gift, Pencil, Check, Video, Building2, MapPin, Info, CreditCard, Banknote, ShoppingBag, Plus, Minus, Tag } from "lucide-react";
import Link from "next/link";
import { format, addDays, startOfDay, isSameDay, isToday, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  description: string | null;
  locationType?: "PRESENTIAL_ONLY" | "VIDEO_ONLY" | "HYBRID";
}

interface Product {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
}

interface ServicePromotion {
  discountPercentage: number;
  discountedPriceCents: number;
  endDate?: string;
}

interface BookingWidgetProps {
  practitionerId: string;
  services: Service[];
  products?: Product[];
  acceptsGiftCards?: boolean;
  allowOfflinePayment?: boolean;
  /** Promotions actives par service (serviceId -> { discountPercentage, discountedPriceCents }) */
  servicePromotions?: Record<string, ServicePromotion>;
  /** Service à pré-sélectionner (ex: lien promo avec ?service=id) */
  initialServiceId?: string;
}

interface AvailabilityResponse {
  availableSlots: string[];
}

export function BookingWidget({
  practitionerId,
  services,
  products = [],
  acceptsGiftCards = false,
  allowOfflinePayment = false,
  servicePromotions = {},
  initialServiceId,
}: BookingWidgetProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState(0);
  const [dateRangeEnd, setDateRangeEnd] = useState(13); // 14 jours par défaut
  const [desktopWeekOffset, setDesktopWeekOffset] = useState(0); // Week offset for desktop calendar

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedLocationChoice, setSelectedLocationChoice] = useState<"PRESENTIAL" | "VIDEO" | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<"online" | "offline" | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [cartProducts, setCartProducts] = useState<Record<string, number>>({});

  // Auto-sélection si lien promo (?service= ou ?promo=)
  useEffect(() => {
    if (initialServiceId && services.some((s) => s.id === initialServiceId) && !selectedServiceId) {
      setSelectedServiceId(initialServiceId);
      setTimeout(() => {
        const widget = document.getElementById("booking-widget");
        if (widget) widget.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [initialServiceId, services, selectedServiceId]);

  // Listen for service selection from external components (e.g., Prestations section)
  useEffect(() => {
    const handleServiceSelect = (event: CustomEvent<string>) => {
      const serviceId = event.detail;
      if (services.some((s) => s.id === serviceId)) {
        setSelectedServiceId(serviceId);
        setTimeout(() => {
          const widget = document.getElementById("booking-widget");
          if (widget) widget.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    };

    window.addEventListener("selectService" as any, handleServiceSelect as EventListener);
    return () => {
      window.removeEventListener("selectService" as any, handleServiceSelect as EventListener);
    };
  }, [services]);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch available slots for selected date and service
  const { data: availability, isLoading: isLoadingAvailability } = useQuery<AvailabilityResponse>({
    queryKey: ["availability", practitionerId, selectedDate, selectedServiceId],
    queryFn: async () => {
      if (!selectedDate || !selectedServiceId) return null;
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await fetch(
        `/api/practitioners/${practitionerId}/availability?date=${dateStr}&serviceId=${selectedServiceId}`
      );
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
    enabled: !!selectedDate && !!selectedServiceId,
  });

  // Generate dates for mobile strip
  const mobileDates = useMemo(() => {
    return Array.from({ length: dateRangeEnd - dateRangeStart + 1 }, (_, i) =>
      addDays(startOfDay(new Date()), dateRangeStart + i)
    );
  }, [dateRangeStart, dateRangeEnd]);

  // Generate dates for desktop calendar - 7 days (one week) starting from current week
  const desktopCalendarDates = useMemo(() => {
    const today = startOfDay(new Date());
    const weekStart = startOfWeek(addDays(today, desktopWeekOffset * 7), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [desktopWeekOffset]);

  // Fetch availability for multiple dates (for calendar view)
  // Use the actual displayed dates to ensure synchronization
  const datesToCheck = useMemo(() => {
    if (!selectedServiceId) return [];
    if (isMobile) {
      return mobileDates;
    } else {
      return desktopCalendarDates;
    }
  }, [selectedServiceId, isMobile, mobileDates, desktopCalendarDates]);

  // Batch fetch availability for calendar dates
  // Use a more granular cache key to avoid refetching when dates change slightly
  const datesKey = useMemo(() => {
    if (datesToCheck.length === 0) return "";
    return datesToCheck.map(d => format(d, "yyyy-MM-dd")).sort().join(",");
  }, [datesToCheck]);

  const { data: calendarAvailability } = useQuery<Record<string, string[]>>({
    queryKey: ["calendarAvailability", practitionerId, selectedServiceId, datesKey],
    queryFn: async () => {
      if (!selectedServiceId || datesToCheck.length === 0) return {};
      const results: Record<string, string[]> = {};
      
      // Fetch for all dates in the range
      await Promise.all(
        datesToCheck.map(async (date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          try {
            const res = await fetch(
              `/api/practitioners/${practitionerId}/availability?date=${dateStr}&serviceId=${selectedServiceId}`
            );
            if (res.ok) {
              const data = await res.json();
              results[dateStr] = data.availableSlots || [];
            } else {
              // If request fails, mark as no availability
              results[dateStr] = [];
            }
          } catch (error) {
            // If request fails, mark as no availability
            results[dateStr] = [];
          }
        })
      );
      return results;
    },
    enabled: !!selectedServiceId && datesToCheck.length > 0,
    staleTime: 30000, // Cache for 30 seconds
  });

  const hasAvailabilityForDate = (date: Date) => {
    if (!selectedServiceId) return false; // No service selected
    if (!calendarAvailability) return true; // Assume available while loading
    const dateStr = format(date, "yyyy-MM-dd");
    const slots = calendarAvailability[dateStr];
    // If the date is in the results, check if it has slots
    // If the date is not in the results yet, assume available (optimistic)
    if (slots === undefined) return true;
    return slots && slots.length > 0;
  };

  const loadMoreDates = () => {
    setDateRangeEnd(prev => prev + 14);
  };

  const scrollDates = (direction: "left" | "right") => {
    if (direction === "left" && dateRangeStart > 0) {
      setDateRangeStart(prev => Math.max(0, prev - 7));
      setDateRangeEnd(prev => prev - 7);
    } else if (direction === "right") {
      setDateRangeStart(prev => prev + 7);
      setDateRangeEnd(prev => prev + 7);
    }
  };

  // Create appointment mutation (used for paiement sur place / OFFLINE)
  const createAppointment = useMutation({
    mutationFn: async (data: {
      serviceId: string;
      practitionerId: string;
      startsAt: Date;
      locationChoice?: "PRESENTIAL" | "VIDEO" | null;
      paymentMethod?: "stripe" | "offline";
    }) => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: data.serviceId,
          practitionerId: data.practitionerId,
          startsAt: data.startsAt.toISOString(),
          locationChoice: data.locationChoice ?? undefined,
          paymentMethod: data.paymentMethod ?? "stripe",
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create appointment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({
        queryKey: ["availability", practitionerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["calendarAvailability"],
      });
      setBookingSuccess(true);
      setSelectedDate(null);
      setSelectedTime("");
      setSelectedServiceId("");
      setPaymentChoice(null);
      setCartProducts({});
    },
  });

  const [bookingError, setBookingError] = useState<string | null>(null);

  const getLocationChoice = (): "PRESENTIAL" | "VIDEO" | null => {
    if (!selectedService) return null;
    if (selectedService.locationType === "HYBRID") return selectedLocationChoice;
    if (selectedService.locationType === "PRESENTIAL_ONLY") return "PRESENTIAL";
    if (selectedService.locationType === "VIDEO_ONLY") return "VIDEO";
    return null;
  };

  // Visio = uniquement visio ou hybride avec choix vidéo → pas d’option "Payer sur place"
  const isVisioAppointment =
    !!selectedService &&
    (selectedService.locationType === "VIDEO_ONLY" ||
      (selectedService.locationType === "HYBRID" && selectedLocationChoice === "VIDEO"));
  const isPresentialAppointment =
    !!selectedService &&
    (selectedService.locationType === "PRESENTIAL_ONLY" ||
      (selectedService.locationType === "HYBRID" && selectedLocationChoice === "PRESENTIAL"));

  const handleBooking = async () => {
    setBookingError(null);

    if (!session) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : `/praticien/${practitionerId}`;
      const callbackUrl = encodeURIComponent(currentPath);
      router.push(`/connexion?callbackUrl=${callbackUrl}`);
      return;
    }

    if (!selectedDate || !selectedTime || !selectedService) {
      setBookingError("Veuillez sélectionner un service, une date et un horaire");
      return;
    }

    if (selectedService.locationType === "HYBRID" && !selectedLocationChoice) {
      setBookingError("Veuillez choisir le type de séance (cabinet ou visio)");
      return;
    }

    if (allowOfflinePayment && !paymentChoice) {
      setBookingError("Veuillez choisir un mode de paiement");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startsAt = new Date(selectedDate);
    startsAt.setHours(hours, minutes, 0, 0);
    const locationType = getLocationChoice();

    if (paymentChoice === "offline") {
      createAppointment.mutate(
        {
          serviceId: selectedService.id,
          practitionerId,
          startsAt,
          locationChoice: locationType ?? undefined,
          paymentMethod: "offline",
        },
        {
          onError: (err) => setBookingError(err.message || "Erreur lors de la réservation"),
        }
      );
      return;
    }

    const productItems =
      Object.keys(cartProducts).length > 0
        ? Object.entries(cartProducts)
            .filter(([, qty]) => qty > 0)
            .map(([productId, quantity]) => ({ productId, quantity }))
        : [];

    setIsCreatingCheckout(true);
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          practitionerId,
          startsAt: startsAt.toISOString(),
          locationType,
          ...(productItems.length > 0 && { productItems }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      if (url) window.location.href = url;
      else throw new Error("No checkout URL returned");
    } catch (error: any) {
      setIsCreatingCheckout(false);
      setBookingError(error.message || "Une erreur est survenue lors de la création de la session de paiement");
    }
  };

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

  const availableSlots = availability?.availableSlots || [];

  // Determine current step (1 = service, 1.5 = location choice for HYBRID, 2 = date, 3 = time)
  const needsLocationChoice = selectedService?.locationType === "HYBRID" && !selectedLocationChoice;
  const currentStep = selectedServiceId 
    ? (needsLocationChoice && !selectedDate
      ? 1.5
      : (selectedDate 
        ? (selectedTime ? 3 : 2)
        : 1))
    : 1;

  // Auto-set location choice for non-HYBRID services
  useEffect(() => {
    if (selectedService) {
      if (selectedService.locationType === "PRESENTIAL_ONLY") {
        setSelectedLocationChoice("PRESENTIAL");
      } else if (selectedService.locationType === "VIDEO_ONLY") {
        setSelectedLocationChoice("VIDEO");
      } else if (selectedService.locationType === "HYBRID") {
        // Reset to null for HYBRID to require user choice
        setSelectedLocationChoice(null);
      }
    }
  }, [selectedServiceId, selectedService]);

  // Visio : pré-sélectionner "Payer maintenant" pour ne pas afficher l’étape paiement
  useEffect(() => {
    if (allowOfflinePayment && isVisioAppointment && selectedDate && selectedTime) {
      setPaymentChoice("online");
    }
  }, [allowOfflinePayment, isVisioAppointment, selectedDate, selectedTime]);

  // En passant en présentiel (changement de service ou cabinet/visio), réinitialiser le choix pour afficher l’étape paiement
  useEffect(() => {
    if (allowOfflinePayment && isPresentialAppointment) {
      setPaymentChoice(null);
    }
  }, [allowOfflinePayment, selectedServiceId, selectedLocationChoice]);

  // Auto-scroll to next step when completed
  useEffect(() => {
    if (selectedServiceId && needsLocationChoice && !selectedDate) {
      // Scroll to location choice section (step 1.5)
      setTimeout(() => {
        const locationSection = document.getElementById("booking-step-location");
        if (locationSection) {
          locationSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 100);
    } else if (selectedServiceId && !needsLocationChoice && !selectedDate) {
      // Scroll to date section
      setTimeout(() => {
        const dateSection = document.getElementById("booking-step-2");
        if (dateSection) {
          dateSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 100);
    } else if (selectedDate && !selectedTime) {
      // Scroll to time section
      setTimeout(() => {
        const timeSection = document.getElementById("booking-step-3");
        if (timeSection) {
          timeSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 100);
    }
  }, [selectedServiceId, selectedDate, selectedTime, needsLocationChoice]);

  const getSummaryText = () => {
    if (!selectedService || !selectedDate || !selectedTime) return null;
    const dayName = format(selectedDate, "EEE", { locale: fr });
    const dayNumber = format(selectedDate, "d");
    const monthName = format(selectedDate, "MMM", { locale: fr });
    return {
      serviceName: selectedService.name,
      dateTime: `${dayName} ${dayNumber} ${monthName} • ${selectedTime}`,
    };
  };

  // Group mobile dates by month for display
  const getCurrentMonthForMobile = () => {
    if (mobileDates.length === 0) return "";
    const firstDate = mobileDates[0];
    return format(firstDate, "MMMM yyyy", { locale: fr });
  };

  // Show loading skeleton
  if (status === 'loading') {
    return (
      <div id="booking-widget" className="overflow-hidden bg-transparent z-40">
        <div className="w-full p-8 pb-6">
          <div className="flex items-center gap-3 pb-4 border-b border-sable">
            <div className="w-10 h-10 bg-gray-200 rounded-3xl flex items-center justify-center flex-shrink-0 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        </div>
        <div className="px-8 pb-8 space-y-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show login CTA if not authenticated
  if (!session) {
    return (
      <div id="booking-widget" className="overflow-hidden bg-transparent z-40">
        <div className="w-full p-8 pb-6">
          <div className="flex items-center gap-3 pb-4 border-b border-sable">
            <div className="w-10 h-10 bg-sauge rounded-3xl flex items-center justify-center flex-shrink-0">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-anthracite">
              Prenez rendez-vous
            </h2>
          </div>
        </div>
        <div className="px-8 pb-8">
          <div className="text-center py-8">
            <p className="text-anthracite/70 mb-4">
              Connectez-vous pour prendre rendez-vous
            </p>
            <Button
              onClick={() => router.push('/connexion')}
              className="bg-sauge hover:bg-sauge/90"
            >
              Se connecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="booking-widget" 
      className="overflow-hidden bg-transparent z-40"
      style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes checkmarkAppear {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-45deg);
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
      `}} />
      <div className="w-full p-8 pb-6">
        <div className="flex items-center gap-3 pb-4 border-b border-sable">
          <div className="w-10 h-10 bg-sauge rounded-3xl flex items-center justify-center flex-shrink-0">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-anthracite">
            Prenez rendez-vous
          </h2>
        </div>
      </div>
      <div className="px-8 pb-8 space-y-4">
        {/* Section 1: Select Service - Summary when selected */}
        {selectedServiceId ? (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 px-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#9bb49b] flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  {/* Icône du type de localisation dans le résumé */}
                  {selectedService?.locationType === "PRESENTIAL_ONLY" && (
                    <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: "#9bb49b", opacity: 0.7 }} />
                  )}
                  {selectedService?.locationType === "VIDEO_ONLY" && (
                    <Video className="h-4 w-4 flex-shrink-0" style={{ color: "#9bb49b", opacity: 0.7 }} />
                  )}
                  {selectedService?.locationType === "HYBRID" && selectedLocationChoice && (
                    selectedLocationChoice === "PRESENTIAL" ? (
                      <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: "#9bb49b", opacity: 0.7 }} />
                    ) : (
                      <Video className="h-4 w-4 flex-shrink-0" style={{ color: "#9bb49b", opacity: 0.7 }} />
                    )
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700">Service</p>
                    <p className="text-sm text-slate-700">{selectedService.name}</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedServiceId("");
                  setSelectedDate(null);
                  setSelectedTime("");
                  setSelectedLocationChoice(null);
                  setPaymentChoice(null);
                  setCartProducts({});
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Modifier</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-[#9bb49b] text-white flex items-center justify-center font-bold text-sm transition-all duration-300">
                <span>1</span>
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "#2f2f2f" }}>
                Choisir un service
              </h3>
            </div>
          <div className="space-y-3">
            {services.map((service) => {
              const isSelected = selectedServiceId === service.id;
              const promo = servicePromotions[service.id];
              const displayPrice = promo ? promo.discountedPriceCents : service.priceCents;
              const hasPromo = !!promo && promo.discountPercentage > 0;
              const promoEndDate = promo?.endDate ? new Date(promo.endDate) : null;
              const hoursUntilEnd = promoEndDate ? differenceInHours(promoEndDate, new Date()) : Infinity;
              const showUrgency = hasPromo && hoursUntilEnd >= 0 && hoursUntilEnd < 48;
              return (
                <div
                  key={service.id}
                  className="relative w-full text-left p-4 rounded-xl border border-gray-100 bg-white shadow-sm transition-all"
                >
                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedServiceId("");
                        setSelectedDate(null);
                        setSelectedTime("");
                        setCartProducts({});
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-sauge/20 transition-colors"
                      style={{ color: "#9bb49b" }}
                      aria-label="Désélectionner le service"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(service.id);
                      setSelectedDate(null);
                      setSelectedTime("");
                      if (service.locationType === "HYBRID") {
                        setSelectedLocationChoice(null);
                      }
                    }}
                    className="w-full text-left"
                  >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {service.locationType === "PRESENTIAL_ONLY" && (
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#9bb49b", opacity: 0.7 }} />
                        )}
                        {service.locationType === "VIDEO_ONLY" && (
                          <Video className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#9bb49b", opacity: 0.7 }} />
                        )}
                        {service.locationType === "HYBRID" && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#9bb49b", opacity: 0.7 }} />
                            <Video className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#9bb49b", opacity: 0.7 }} />
                          </div>
                        )}
                        <h4
                          className="font-bold text-base break-words inline"
                          style={{ color: "#2f2f2f" }}
                        >
                          {service.name}
                        </h4>
                        {hasPromo && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#e67e22]/10 text-[#e67e22] text-xs font-semibold ml-2 shrink-0">
                            -{promo.discountPercentage}%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4 text-sm">
                        <div
                          className="flex items-center gap-1.5"
                          style={{ color: "#2f2f2f", opacity: 0.7 }}
                        >
                          <Clock className="h-4 w-4 text-[#9bb49b]" />
                          <span>{formatDuration(service.durationMin)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            {hasPromo && (
                              <span className="text-sm text-slate-400 line-through mr-2">
                                {formatPrice(service.priceCents)}
                              </span>
                            )}
                            <span
                              className={`text-base font-bold ${hasPromo ? "text-[#e67e22]" : ""}`}
                              style={!hasPromo ? { color: "#2f2f2f" } : undefined}
                            >
                              {formatPrice(displayPrice)}
                            </span>
                          </div>
                          {showUrgency && (
                            <span className="text-xs text-red-600/80">
                              ⌛ finit dans {hoursUntilEnd > 0 ? `${hoursUntilEnd}h` : "moins d'1h"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Step 1.5: Location Choice (only for HYBRID services) - Affiché après le choix du service */}
        {selectedService && selectedService.locationType === "HYBRID" && !selectedLocationChoice && !selectedDate && (
          <div id="booking-step-location" className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 mt-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-[#9bb49b] text-white flex items-center justify-center font-bold text-sm transition-all duration-300">
                <span>1.5</span>
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "#2f2f2f" }}>
                Où souhaitez-vous réaliser la séance ?
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedLocationChoice("PRESENTIAL")}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all text-center ${
                  selectedLocationChoice === "PRESENTIAL"
                    ? "border-2 border-[#9bb49b] bg-[#9bb49b]/5"
                    : "border border-gray-100 bg-white hover:bg-gray-50"
                }`}
              >
                <MapPin className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <div className="font-semibold text-anthracite text-base">Au cabinet</div>
                  <div className="text-sm text-anthracite/70">Séance en présentiel</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLocationChoice("VIDEO")}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all text-center ${
                  selectedLocationChoice === "VIDEO"
                    ? "border-2 border-[#9bb49b] bg-[#9bb49b]/5"
                    : "border border-gray-100 bg-white hover:bg-gray-50"
                }`}
              >
                <Video className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <div className="font-semibold text-anthracite text-base">En vidéo</div>
                  <div className="text-sm text-anthracite/70">Séance à distance</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Mentions informatives pour IN_PERSON et VIDEO_ONLY - Affichées sous le service sélectionné */}
        {selectedService && 
         (selectedService.locationType === "PRESENTIAL_ONLY" || selectedService.locationType === "VIDEO_ONLY") && 
         !selectedDate && (
          <div className="bg-[#9bb49b]/5 border border-[#9bb49b]/20 rounded-xl p-4 mt-4">
            <div className="flex items-start gap-3">
              {selectedService.locationType === "PRESENTIAL_ONLY" ? (
                <>
                  <MapPin className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-anthracite flex-1">
                    <span className="font-medium">Cette séance se déroule uniquement au cabinet du praticien.</span>
                  </p>
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-anthracite flex-1">
                    <span className="font-medium">Cette séance se déroule uniquement en visioconférence.</span>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Section 2 & 3: Date/Time - affichée juste après le service (et le lieu si HYBRID) */}
        {selectedServiceId && !needsLocationChoice && (
          <>
            {selectedDate && selectedTime ? (
              // Merged Date/Time Summary
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#9bb49b] flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-[#9bb49b] flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                          {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#9bb49b] flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700">{selectedTime}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTime("");
                    }}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Modifier</span>
                  </button>
                </div>
              </div>
            ) : (
              // Date/Time Pickers
              <>
                {/* Section 2: Select Date */}
                <div id="booking-step-2" className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-[#9bb49b] text-white flex items-center justify-center font-bold text-sm transition-all duration-300">
                      {selectedDate ? (
                        <Check 
                          className="h-5 w-5 text-white" 
                          style={{
                            animation: "checkmarkAppear 0.3s ease-out forwards"
                          }}
                        />
                      ) : (
                        <span>2</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: "#2f2f2f" }}>
                      Choisir une date
                    </h3>
                  </div>
                  {/* Mobile: Scrollable Date Strip */}
                  {isMobile ? (
                    <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-medium" style={{ color: "#2f2f2f" }}>
                    {getCurrentMonthForMobile()}
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollDates("left")}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      disabled={dateRangeStart === 0}
                    >
                      <ChevronLeft className="h-5 w-5" style={{ color: "#2f2f2f" }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollDates("right")}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" style={{ color: "#2f2f2f" }} />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                  <div className="flex gap-3 min-w-max">
                    {mobileDates.map((date) => {
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      const isTodayDate = isToday(date);
                      const hasAvailability = hasAvailabilityForDate(date);
                      const isPast = date < startOfDay(new Date());

                      return (
                        <button
                          key={date.toISOString()}
                          type="button"
                          onClick={() => {
                            if (!isPast && hasAvailability) {
                              setSelectedDate(date);
                              setSelectedTime("");
                            }
                          }}
                          disabled={isPast || !hasAvailability}
                          className="flex flex-col items-center justify-center rounded-full px-4 py-3 min-w-[60px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: isSelected ? "#9bb49b" : "transparent",
                            color: isSelected ? "white" : isPast || !hasAvailability ? "#9ca3af" : "#2f2f2f",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected && !isPast && hasAvailability) {
                              e.currentTarget.style.backgroundColor = "#f5f5f5";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          <div className="text-xs font-medium mb-1">
                            {format(date, "EEE", { locale: fr })}
                          </div>
                          <div className="text-xl font-bold">
                            {format(date, "d")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadMoreDates}
                  className="mt-3 text-sm font-medium w-full py-2 rounded-2xl border border-sable hover:bg-gray-100 transition-colors"
                  style={{ color: "#9bb49b" }}
                >
                  Afficher plus de dates
                </button>
                    </div>
                  ) : (
                    /* Desktop: Calendar Grid */
                    <div>
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setDesktopWeekOffset(prev => prev - 1)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    style={{ color: "#2f2f2f" }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h4 className="text-base font-medium" style={{ color: "#2f2f2f" }}>
                    {format(desktopCalendarDates[0], "d MMMM", { locale: fr })} - {format(desktopCalendarDates[6], "d MMMM yyyy", { locale: fr })}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setDesktopWeekOffset(prev => prev + 1)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    style={{ color: "#2f2f2f" }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((dayName) => (
                    <div
                      key={dayName}
                      className="text-center text-sm font-medium py-2"
                      style={{ color: "#2f2f2f", opacity: 0.6 }}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {desktopCalendarDates.map((date) => {
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const isTodayDate = isToday(date);
                    const today = startOfDay(new Date());
                    const hasAvailability = hasAvailabilityForDate(date);
                    const isPast = date < today;

                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => {
                          if (!isPast && hasAvailability) {
                            setSelectedDate(date);
                            setSelectedTime("");
                          }
                        }}
                        disabled={isPast || !hasAvailability}
                        className="aspect-square rounded-2xl border border-sable p-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: isSelected ? "#9bb49b" : "white",
                          color: isSelected
                            ? "white"
                            : isPast || !hasAvailability
                            ? "#9ca3af"
                            : "#2f2f2f",
                        }}
                      >
                        <div className="text-sm font-medium">
                          {format(date, "d")}
                        </div>
                      </button>
                    );
                  })}
                </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Select Time (only if date selected but not time) */}
                {selectedDate && !selectedTime && (
                  <div id="booking-step-3" className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-[#9bb49b] text-white flex items-center justify-center font-bold text-sm transition-all duration-300">
                        <span>3</span>
                      </div>
                      <h3 className="text-lg font-semibold" style={{ color: "#2f2f2f" }}>
                        Choisir un horaire
                      </h3>
                    </div>
                    {isLoadingAvailability ? (
                      <div className="flex h-20 w-full items-center justify-center rounded-2xl border border-gray-100 text-sm bg-white text-anthracite/60">
                        Chargement...
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {availableSlots.map((time) => {
                          const isSelected = selectedTime === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedTime(time)}
                              className={`py-3 px-4 rounded-2xl border text-sm font-medium transition-all ${
                                isSelected
                                  ? "border-[#9bb49b] bg-[#9bb49b] text-white"
                                  : "border-gray-100 bg-white text-anthracite"
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border border-red-200 text-sm text-center bg-red-50 text-red-600">
                        Aucun créneau disponible pour cette date
                      </div>
                    )}
                  </div>
                )}

              </>
            )}
          </>
        )}

        {/* Step 4: Choix du mode de paiement (dernière étape, uniquement présentiel au cabinet) */}
        {selectedService &&
          selectedDate &&
          selectedTime &&
          !needsLocationChoice &&
          allowOfflinePayment &&
          isPresentialAppointment &&
          paymentChoice === null && (
          <div id="booking-step-payment" className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-[#9bb49b] text-white flex items-center justify-center font-bold text-sm">
                <span>4</span>
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "#2f2f2f" }}>
                Comment souhaitez-vous payer ?
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentChoice("online")}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-[#9bb49b] bg-[#9bb49b]/5 transition-all text-center"
              >
                <CreditCard className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-anthracite text-base">Payer maintenant (CB)</div>
                  <div className="text-sm text-anthracite/70">Paiement sécurisé en ligne</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentChoice("offline")}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition-all text-center"
              >
                <Banknote className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-anthracite text-base">Payer sur place</div>
                  <div className="text-sm text-anthracite/70">Espèces ou chèque au cabinet</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Cross-sell Boutique */}
        {products.length > 0 &&
          selectedService &&
          selectedDate &&
          selectedTime &&
          !needsLocationChoice &&
          (!allowOfflinePayment || paymentChoice !== null || isVisioAppointment) && (
          <div id="booking-step-products" className="mt-4 bg-white border border-gray-100 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="h-4 w-4 text-sauge" />
              <h3 className="text-sm font-semibold text-anthracite">Complétez votre réservation</h3>
            </div>
            <p className="text-xs text-anthracite/60 mb-3">Ajoutez un produit à votre commande (optionnel)</p>
            <div className="space-y-2">
              {products.filter((p) => p.stock > 0).map((product) => {
                const qty = cartProducts[product.id] || 0;
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-[#fafaf9]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-anthracite truncate">{product.name}</p>
                      <p className="text-xs font-semibold text-sauge">{formatPrice(product.priceCents)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => setCartProducts((prev) => ({ ...prev, [product.id]: Math.max(0, (prev[product.id] || 0) - 1) }))} disabled={qty <= 0} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-anthracite/70 hover:bg-gray-100 disabled:opacity-40">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{qty}</span>
                      <button type="button" onClick={() => setCartProducts((prev) => ({ ...prev, [product.id]: Math.min(product.stock, (prev[product.id] || 0) + 1) }))} disabled={qty >= product.stock} className="w-8 h-8 rounded-full border border-sauge bg-sauge/10 text-sauge flex items-center justify-center hover:bg-sauge/20 disabled:opacity-40">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {selectedService &&
          selectedDate &&
          selectedTime &&
          !needsLocationChoice &&
          (!allowOfflinePayment || paymentChoice !== null || isVisioAppointment) && (
          <div className="mt-8">
            <Button
              type="button"
              className="w-full rounded-xl shadow-md bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
              onClick={handleBooking}
              disabled={isCreatingCheckout || createAppointment.isPending}
            >
              {createAppointment.isPending
                ? "Réservation en cours..."
                : isCreatingCheckout
                  ? "Redirection vers le paiement..."
                    : paymentChoice === "offline"
                    ? (() => {
                        const servicePrice = servicePromotions[selectedService.id]?.discountedPriceCents ?? selectedService.priceCents;
                        return `Confirmer la réservation (${formatPrice(servicePrice)} à régler sur place)`;
                      })()
                    : (() => {
                        const servicePrice = servicePromotions[selectedService.id]?.discountedPriceCents ?? selectedService.priceCents;
                        const productsTotal = Object.entries(cartProducts).reduce(
                          (sum, [pid, qty]) => {
                            const p = products.find((x) => x.id === pid);
                            return sum + (p ? p.priceCents * qty : 0);
                          },
                          0
                        );
                        const total = servicePrice + productsTotal;
                        return `Confirmer et payer ${formatPrice(total)}`;
                      })()}
            </Button>
            {bookingError && (
              <div
                className="mt-4 p-4 rounded-xl text-sm border border-red-200"
                style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
              >
                {bookingError}
              </div>
            )}
          </div>
        )}

        {createAppointment.isError && (
          <div
            className="p-4 rounded-2xl text-sm"
            style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
          >
            {createAppointment.error instanceof Error
              ? createAppointment.error.message
              : "Une erreur est survenue"}
          </div>
        )}

        {bookingSuccess && (
          <div className="p-6 rounded-2xl border border-sauge space-y-4 bg-sauge">
            <div className="text-center text-white">
              <div className="text-2xl mb-2">✓</div>
              <h3 className="text-lg font-semibold mb-2">
                Réservation confirmée !
              </h3>
              <p className="text-sm opacity-90">
                Votre réservation a été enregistrée avec succès. Vous recevrez un email de confirmation.
              </p>
            </div>
            <Button
              type="button"
              className="w-full rounded-full py-3 text-base font-semibold bg-white text-sauge hover:bg-[#f7f7f7]"
              onClick={() => {
                router.push("/account/appointments");
              }}
            >
              Voir ma réservation
            </Button>
            <button
              type="button"
              onClick={() => setBookingSuccess(false)}
              className="w-full text-sm text-center py-2 text-white opacity-80 hover:opacity-100 transition-opacity"
            >
              Réserver un autre créneau
            </button>
          </div>
        )}

        {/* Gift Card Section - Minimalist design - Only show if acceptsGiftCards is true */}
        {acceptsGiftCards && (
          <div className="pt-6 border-t border-sable/30">
            <p className="text-xs text-anthracite/60 mb-3">
              Vous souhaitez offrir un moment de bien-être ?
            </p>
            <Link
              href={`/gift-cards/new?practitionerId=${practitionerId}`}
              className="inline-flex items-center gap-2 text-xs font-medium text-[#9bb49b] hover:text-[#8aa483] transition-colors"
            >
              <Gift className="h-3.5 w-3.5" />
              Offrir une carte cadeau
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
