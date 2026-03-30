"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Tag, RotateCcw, MapPin, ChevronDown, X } from "lucide-react";

const EVENT_TYPES = [
  { value: "", label: "Tous les types" },
  { value: "CONFERENCE", label: "Conférence" },
  { value: "ATELIER", label: "Atelier" },
  { value: "STAGE", label: "Stage" },
] as const;

interface EventsSearchFiltersProps {
  eventType: string;
  dateFrom: string;
  dateTo: string;
  searchCity: string;
  onFiltersChange?: (updates: { eventType?: string; dateFrom?: string; dateTo?: string; city?: string }) => void;
  onCitySelected?: (coords: { lat: number; lng: number }) => void;
}

export function EventsSearchFilters({
  eventType,
  dateFrom,
  dateTo,
  searchCity,
  onFiltersChange,
  onCitySelected,
}: EventsSearchFiltersProps) {
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState(searchCity);
  const [citySuggestions, setCitySuggestions] = useState<Array<{ label: string; coords: { lat: number; lng: number } }>>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const updateURL = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    Object.entries(updates).forEach(([key, value]) => {
      if (key === "lat" || key === "lng") {
        if (value === undefined || value === null || value === "") params.delete(key);
        else params.set(key, String(value));
        return;
      }
      const urlKey = key === "eventType" ? "type" : key;
      if (value === undefined || value === null || value === "") params.delete(urlKey);
      else params.set(urlKey, String(value));
    });
    params.delete("payment");
    params.delete("bounds");
    router.push(`/evenements?${params.toString()}`);
    onFiltersChange?.({ ...updates } as any);
  };

  const handleReset = () => {
    router.push("/evenements");
    setCityInput("");
    onFiltersChange?.({ eventType: "", dateFrom: "", dateTo: "", city: "" });
  };

  const hasActiveFilters = !!(eventType || dateFrom || dateTo || searchCity);

  // Ville autocomplete : Adresse Gouv d'abord, Mapbox fallback pour BE/CH/LU
  useEffect(() => {
    if (!cityInput || cityInput.length < 3) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cityInput)}&type=municipality&limit=8`
        );
        const data = await res.json();
        let items: Array<{ label: string; coords: { lat: number; lng: number } }> = (data.features || [])
          .filter((f: any) => f.properties?.type === "municipality" && f.geometry?.coordinates)
          .map((f: any) => {
            const [lng, lat] = f.geometry.coordinates;
            const cityName = f.properties?.city || f.properties?.name || "";
            return { label: cityName, coords: { lat, lng } };
          })
          .filter((a: { label: string }) => a.label);
        if (items.length === 0) {
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
          if (token) {
            const mbRes = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityInput)}.json?types=place,locality&limit=8&language=fr&access_token=${token}`,
              { headers: { "Accept-Language": "fr" } }
            );
            if (mbRes.ok) {
              const mbData = await mbRes.json();
              const labels: Record<string, string> = { FR: "France", BE: "Belgique", CH: "Suisse", LU: "Luxembourg", MC: "Monaco" };
              items = (mbData.features || [])
                .filter((f: any) => f.center?.length && f.center[1] >= 43 && f.center[1] <= 52 && f.center[0] >= -5 && f.center[0] <= 11)
                .map((f: any) => {
                  const [lng, lat] = f.center;
                  const cityName = f.text || f.place_name?.split(",")?.[0] || "";
                  const ctx = f.context || [];
                  const cc = (ctx.find((c: any) => c.id?.startsWith("country"))?.short_code || "FR").toUpperCase();
                  if (!["FR", "BE", "CH", "LU", "MC"].includes(cc)) return null;
                  return { label: `${cityName} (${labels[cc] || cc})`, coords: { lat, lng } };
                })
                .filter(Boolean) as Array<{ label: string; coords: { lat: number; lng: number } }>;
            }
          }
        }
        setCitySuggestions(items);
        setShowCitySuggestions(items.length > 0);
      } catch {
        setCitySuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cityInput]);

  useEffect(() => {
    setCityInput(searchCity);
  }, [searchCity]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        cityRef.current && !cityRef.current.contains(e.target as Node) &&
        typeRef.current && !typeRef.current.contains(e.target as Node) &&
        dateRef.current && !dateRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedType = EVENT_TYPES.find((t) => t.value === eventType)?.label || "Type";

  return (
    <div className="bg-[#faf8f4]/90 backdrop-blur-md border-b border-gray-100 py-4 px-4 sm:px-6 lg:px-8 relative z-[1100] overflow-visible">
      <div className="flex items-center gap-3 overflow-x-auto overflow-y-visible pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Ville */}
        <div className="flex-shrink-0 relative" ref={cityRef}>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9bb49b] z-10" />
            <input
              type="text"
              placeholder="Ville"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onFocus={() => cityInput.length >= 3 && setShowCitySuggestions(true)}
              className="pl-10 pr-8 py-2 rounded-full bg-white border border-gray-200 text-sm text-[#2f2f2f] placeholder:text-gray-400 focus:ring-0 focus:outline-none shadow-sm min-w-[160px]"
            />
            {searchCity && (
              <button
                type="button"
                onClick={() => {
                  setCityInput("");
                  updateURL({ city: "", lat: undefined, lng: undefined });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            {showCitySuggestions && (citySuggestions.length > 0 || isLoadingSuggestions) && (
              <div className="absolute top-full left-0 mt-2 bg-white/95 backdrop-blur-sm border border-[#9bb49b] rounded-xl shadow-lg max-h-60 overflow-y-auto z-[1200] min-w-[220px]">
                {isLoadingSuggestions ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Recherche...</div>
                ) : (
                  citySuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-[#9bb49b]/10 flex items-center gap-2"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCityInput(s.label);
                        setShowCitySuggestions(false);
                        updateURL({
                          city: s.label,
                          lat: s.coords.lat,
                          lng: s.coords.lng,
                        });
                        onCitySelected?.(s.coords);
                      }}
                    >
                      <MapPin className="h-4 w-4 text-anthracite/60" />
                      {s.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Type */}
        <div className="flex-shrink-0 relative" ref={typeRef}>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md ${
              eventType
                ? "bg-[#9bb49b] text-white border-transparent"
                : "bg-white text-gray-700 border border-gray-200 shadow-sm"
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>{selectedType}</span>
            {eventType && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateURL({ type: "", dateFrom, dateTo });
                }}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>
          {openDropdown === "type" && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 min-w-[180px] z-[1200]">
              {EVENT_TYPES.map((opt) => (
                <button
                  key={opt.value || "all"}
                  onClick={() => {
                    updateURL({ type: opt.value, dateFrom, dateTo });
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    eventType === opt.value ? "text-[#9bb49b] font-medium" : "text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date From / To */}
        <div className="flex-shrink-0 relative" ref={dateRef}>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "date" ? null : "date")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md ${
              dateFrom || dateTo
                ? "bg-[#9bb49b] text-white border-transparent"
                : "bg-white text-gray-700 border border-gray-200 shadow-sm"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>
              {dateFrom && dateTo
                ? `${dateFrom} → ${dateTo}`
                : dateFrom
                ? `À partir du ${dateFrom}`
                : dateTo
                ? `Jusqu'au ${dateTo}`
                : "Dates"}
            </span>
            {(dateFrom || dateTo) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateURL({ type: eventType, dateFrom: "", dateTo: "" });
                }}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>
          {openDropdown === "date" && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 min-w-[280px] z-[1200]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">À partir du</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => updateURL({ type: eventType, dateFrom: e.target.value, dateTo })}
                    className="w-full px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#9bb49b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Jusqu'au</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => updateURL({ type: eventType, dateFrom, dateTo: e.target.value })}
                    className="w-full px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#9bb49b] focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={() => setOpenDropdown(null)}
                className="mt-3 w-full py-2 rounded-2xl bg-[#9bb49b]/10 text-[#9bb49b] text-sm font-medium hover:bg-[#9bb49b]/20"
              >
                Appliquer
              </button>
            </div>
          )}
        </div>

        {/* Réinitialiser */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-200 shadow-sm hover:shadow-md transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
