"use client";

import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";

interface SimpleAvailabilityProps {
  practitionerId: string;
  serviceId?: string | null;
}

export function SimpleAvailability({
  practitionerId,
  serviceId,
}: SimpleAvailabilityProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Intersection Observer pour détecter la visibilité
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // Si le composant sort de la vue, annuler la requête en cours
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }
          // Ne pas remettre isVisible à false pour garder le cache
          // setIsVisible(false);
        }
      },
      {
        rootMargin: "50px", // Déclencher 50px avant que le composant soit visible
        threshold: 0.1, // Déclencher dès que 10% est visible
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      // Nettoyer l'AbortController au démontage
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 4 prochains jours
  const dates = Array.from({ length: 4 }, (_, i) =>
    addDays(startOfDay(new Date()), i)
  );

  // Récupérer les disponibilités pour chaque jour - seulement si visible
  const { data: availabilities, isLoading } = useQuery<
    Array<{ date: string; availableSlots: string[] }>
  >({
    queryKey: ["availability", practitionerId, serviceId, dates[0].toISOString(), 4],
    queryFn: async ({ signal }) => {
      // Créer un nouvel AbortController pour cette requête
      abortControllerRef.current = new AbortController();
      
      // Créer un signal combiné qui s'annule si l'un des deux signaux est annulé
      // Si React Query annule (via signal), ou si notre AbortController annule, la requête s'arrête
      const combinedSignal = (() => {
        if (!signal) {
          return abortControllerRef.current.signal;
        }
        
        // Si React Query fournit un signal, créer un controller qui écoute les deux
        const controller = new AbortController();
        
        // Si le signal de React Query est annulé, annuler notre controller
        if (signal.aborted) {
          controller.abort();
        } else {
          signal.addEventListener('abort', () => {
            controller.abort();
          });
        }
        
        // Si notre AbortController est annulé, annuler aussi
        if (abortControllerRef.current.signal.aborted) {
          controller.abort();
        } else {
          abortControllerRef.current.signal.addEventListener('abort', () => {
            controller.abort();
          });
        }
        
        return controller.signal;
      })();

      const promises = dates.map(async (date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const params = new URLSearchParams({
          date: dateStr,
        });
        if (serviceId) {
          params.append("serviceId", serviceId);
        }

        try {
          const res = await fetch(
            `/api/practitioners/${practitionerId}/availability?${params.toString()}`,
            { signal: combinedSignal }
          );
          if (!res.ok) return null;
          const data = await res.json();
          return {
            date: dateStr,
            availableSlots: data.availableSlots || [],
          };
        } catch (error: any) {
          // Ignorer les erreurs d'annulation
          if (error.name === 'AbortError') {
            return null;
          }
          throw error;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((r) => r !== null) as Array<{
        date: string;
        availableSlots: string[];
      }>;
    },
    enabled: !!practitionerId && isVisible, // Ne charger que si visible
    staleTime: 5 * 60 * 1000, // Cache pendant 5 minutes
    gcTime: 10 * 60 * 1000, // Garder en cache pendant 10 minutes
  });

  // Vérifier si le matin ou l'après-midi est disponible
  const checkPeriod = (slots: string[]) => {
    const morning = slots.some((slot) => {
      const [hours] = slot.split(":").map(Number);
      return hours >= 9 && hours < 12;
    });
    const afternoon = slots.some((slot) => {
      const [hours] = slot.split(":").map(Number);
      return hours >= 14 && hours < 18;
    });
    return { morning, afternoon };
  };

  return (
    <div ref={containerRef} className="flex gap-2">
      {dates.map((date, index) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const availability = availabilities?.find((av) => av.date === dateStr);
        const slots = availability?.availableSlots || [];
        const { morning, afternoon } = checkPeriod(slots);
        const isDayToday = isToday(date);
        const isStillLoading = isLoading && !isVisible;

        return (
          <div key={dateStr} className="flex-1">
            <div
              className={`text-xs font-medium mb-1 ${
                isDayToday ? "text-sauge font-semibold" : "text-anthracite/70"
              }`}
            >
              {format(date, "EEE", { locale: fr }).toUpperCase()}
            </div>
            <div
              className={`text-sm font-bold mb-2 ${
                isDayToday ? "text-sauge" : "text-anthracite"
              }`}
            >
              {format(date, "d")}
            </div>
            <div className="space-y-1">
              {isStillLoading ? (
                <>
                  <div className="h-6 bg-sable/30 rounded" />
                  <div className="h-6 bg-sable/30 rounded" />
                </>
              ) : (
                <>
                  <div
                    className={`h-6 rounded text-xs font-medium flex items-center justify-center ${
                      morning
                        ? "bg-sauge text-white"
                        : "bg-sable/30 text-anthracite/40"
                    }`}
                  >
                    Matin
                  </div>
                  <div
                    className={`h-6 rounded text-xs font-medium flex items-center justify-center ${
                      afternoon
                        ? "bg-sauge text-white"
                        : "bg-sable/30 text-anthracite/40"
                    }`}
                  >
                    Après-midi
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

