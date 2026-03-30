"use client";

import { Clock } from "lucide-react";
import { useState } from "react";

interface WorkingHoursDisplayProps {
  workingHours: Array<{
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>;
}

const dayNames = [
  "", // Index 0 non utilisé
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export function WorkingHoursDisplay({ workingHours }: WorkingHoursDisplayProps) {
  const [showFullWeek, setShowFullWeek] = useState(false);

  if (!workingHours || workingHours.length === 0) {
    return null;
  }

  // Get current day (1 = Monday, 7 = Sunday)
  const today = new Date();
  const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  // Group hours by day
  const hoursByDay: Record<number, typeof workingHours> = {};
  workingHours.forEach(wh => {
    if (!hoursByDay[wh.day_of_week]) {
      hoursByDay[wh.day_of_week] = [];
    }
    hoursByDay[wh.day_of_week].push(wh);
  });

  // Get today's hours
  const todayHours = hoursByDay[currentDayOfWeek];
  const isOpenToday = todayHours && todayHours.length > 0;

  // Format hours for display
  const formatHours = (hours: typeof workingHours) => {
    return hours
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map(wh => `${wh.start_time} - ${wh.end_time}`)
      .join(" / ");
  };

  // Get all week hours for tooltip
  const weekHours = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    const hours = hoursByDay[day];
    return {
      day,
      dayName: dayNames[day],
      hours: hours ? formatHours(hours) : "Fermé",
    };
  });

  // Find next opening day and time
  const findNextOpening = () => {
    // Check remaining days of current week
    for (let i = currentDayOfWeek + 1; i <= 7; i++) {
      const hours = hoursByDay[i];
      if (hours && hours.length > 0) {
        const sortedHours = hours.sort((a, b) => a.start_time.localeCompare(b.start_time));
        return {
          day: i,
          dayName: dayNames[i],
          time: sortedHours[0].start_time,
        };
      }
    }
    // Check next week
    for (let i = 1; i <= currentDayOfWeek; i++) {
      const hours = hoursByDay[i];
      if (hours && hours.length > 0) {
        const sortedHours = hours.sort((a, b) => a.start_time.localeCompare(b.start_time));
        return {
          day: i,
          dayName: dayNames[i],
          time: sortedHours[0].start_time,
        };
      }
    }
    return null;
  };

  const nextOpening = findNextOpening();

  if (!isOpenToday) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setShowFullWeek(true)}
        onMouseLeave={() => setShowFullWeek(false)}
      >
        <div className="flex items-center gap-2 text-sm text-anthracite/70 cursor-help">
          <Clock className="h-4 w-4 text-sauge" />
          <span>
            Fermé aujourd'hui
            {nextOpening && ` — Prochaine ouverture ${nextOpening.dayName} à ${nextOpening.time}`}
          </span>
        </div>
        
        {/* Tooltip with full week */}
        {showFullWeek && (
          <div className="absolute top-full left-0 mt-2 z-[100] bg-white rounded-2xl border border-sable shadow-lg p-4 min-w-[280px]">
            <h4 className="font-semibold text-anthracite mb-3 text-sm">Horaires d'ouverture</h4>
            <div className="space-y-2 text-xs">
              {weekHours.map(({ day, dayName, hours }) => (
                <div
                  key={day}
                  className={`flex items-center justify-between gap-4 ${
                    day === currentDayOfWeek ? "font-semibold text-sauge" : "text-anthracite/70"
                  }`}
                >
                  <span className="min-w-[80px]">{dayName}</span>
                  <span className="text-right">{hours}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowFullWeek(true)}
      onMouseLeave={() => setShowFullWeek(false)}
    >
      <div className="flex items-center gap-2 text-sm text-anthracite/70 cursor-help">
        <Clock className="h-4 w-4 text-sauge" />
        <span>Ouvert aujourd'hui : {formatHours(todayHours)}</span>
      </div>
      
      {/* Tooltip with full week */}
      {showFullWeek && (
        <div className="absolute top-full left-0 mt-2 z-[100] bg-white rounded-2xl border border-sable shadow-lg p-4 min-w-[280px]">
          <h4 className="font-semibold text-anthracite mb-3 text-sm">Horaires d'ouverture</h4>
          <div className="space-y-2 text-xs">
            {weekHours.map(({ day, dayName, hours }) => (
              <div
                key={day}
                className={`flex items-center justify-between gap-4 ${
                  day === currentDayOfWeek ? "font-semibold text-sauge" : "text-anthracite/70"
                }`}
              >
                <span className="min-w-[80px]">{dayName}</span>
                <span className="text-right">{hours}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

