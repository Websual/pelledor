"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { format, addDays, startOfDay, isToday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";


interface AvailabilitySlot {
  date: string;
  availableSlots: string[];
}

interface PractitionerAvailabilityProps {
  practitionerId: string;
  serviceId?: string | null;
  daysCount?: number; // Nombre de jours à afficher (par défaut 5)
}

export function PractitionerAvailability({
  practitionerId,
  serviceId,
  daysCount = 5,
}: PractitionerAvailabilityProps) {
  const [startDate, setStartDate] = useState(startOfDay(new Date()));

  // Calculer les dates à afficher
  const dates = Array.from({ length: daysCount }, (_, i) =>
    addDays(startDate, i)
  );

  // Récupérer les disponibilités pour chaque jour
  const { data: availabilities, isLoading } = useQuery<AvailabilitySlot[]>({
    queryKey: ["availability", practitionerId, serviceId, dates[0].toISOString(), daysCount],
    queryFn: async () => {
      const promises = dates.map(async (date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const params = new URLSearchParams({
          date: dateStr,
        });
        if (serviceId) {
          params.append("serviceId", serviceId);
        }

        const res = await fetch(
          `/api/practitioners/${practitionerId}/availability?${params.toString()}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        return {
          date: dateStr,
          availableSlots: data.availableSlots || [],
        } as AvailabilitySlot;
      });

      const results = await Promise.all(promises);
      return results.filter((r) => r !== null) as AvailabilitySlot[];
    },
    enabled: !!practitionerId,
  });

  const goToPreviousPeriod = () => {
    setStartDate(addDays(startDate, -daysCount));
  };

  const goToNextPeriod = () => {
    setStartDate(addDays(startDate, daysCount));
  };

  const goToToday = () => {
    setStartDate(startOfDay(new Date()));
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-anthracite/60">Chargement des disponibilités...</p>
      </div>
    );
  }

  const hasAvailabilities = availabilities?.some((av) => av.availableSlots.length > 0);

  return (
    <div className="border-t border-sable pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-anthracite">Disponibilités</h4>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPeriod}
            className="h-6 w-6 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-6 px-2 text-xs"
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPeriod}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!hasAvailabilities ? (
        <div className="text-center py-6 text-sm text-anthracite/60">
          <Clock className="h-5 w-5 mx-auto mb-2 text-anthracite/40" />
          <p>Aucun créneau disponible pour cette période</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {dates.map((date, index) => {
            const availability = availabilities?.find(
              (av) => isSameDay(new Date(av.date), date)
            );
            const slots = availability?.availableSlots || [];
            const isDayToday = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`border rounded-3xl p- text-center ${
                  isDayToday
                    ? "border-sauge bg-sauge/5"
                    : "border-sable bg-white"
                }`}
              >
                <div
                  className={`text-xs font-medium mb-1 ${
                    isDayToday ? "text-sauge" : "text-anthracite/70"
                  }`}
                >
                  {format(date, "EEE", { locale: fr })}
                </div>
                <div
                  className={`text-sm font-bold mb-2 ${
                    isDayToday ? "text-sauge" : "text-anthracite"
                  }`}
                >
                  {format(date, "d")}
                </div>
                {slots.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-green-600">
                      {slots.length} créneau{slots.length > 1 ? "x" : ""}
                    </div>
                    <div className="text-xs text-anthracite/60">
                      {slots.slice(0, 2).join(", ")}
                      {slots.length > 2 && ` +${slots.length - 2}`}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-anthracite/40">Aucun</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

