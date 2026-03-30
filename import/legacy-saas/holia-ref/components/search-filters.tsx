"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { MapPin, ChevronDown, X, Navigation, RotateCcw } from "lucide-react";
import { useCitySearch } from "@/hooks/use-city-search";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { Input } from "@/components/ui";
import { useRouter } from "next/navigation";
import useSWR from "swr";

interface SearchFiltersProps {
  searchCity: string;
  professionId: string;
  minRating: string;
  maxPrice: string;
  sortBy: "rating" | "price" | "distance";
  professions: Array<{ id: string; name: string; slug: string; practitionerCount?: number }>;
  mapBounds?: { north: number; south: number; east: number; west: number } | null;
  onLocationDetected?: (cityName: string) => void; // Callback quand une ville est détectée
  onCitySelected?: (coords: { lat: number; lng: number }) => void; // Callback avec coordonnées
}

const ratingOptions = [
  { value: "", label: "Toutes les notes" },
  { value: "4.5", label: "4.5+ étoiles" },
  { value: "4", label: "4+ étoiles" },
  { value: "3", label: "3+ étoiles" },
];

const sortOptions = [
  { value: "rating", label: "Recommandés" },
  { value: "price", label: "Prix" },
  { value: "distance", label: "Distance" },
];

export function SearchFilters({
  searchCity,
  professionId,
  minRating,
  maxPrice,
  sortBy,
  professions,
  mapBounds,
  onLocationDetected,
  onCitySelected,
}: SearchFiltersProps) {
  const router = useRouter();
  
  // Fonction pour mettre à jour l'URL (router.push pour que Next.js mette à jour useSearchParams)
  const updateURL = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.delete("page");
    const newUrl = `/recherche?${params.toString()}`;
    router.push(newUrl);
  }, [router]);

  // Fonction pour réinitialiser tous les filtres
  const handleResetFilters = () => {
    router.push('/recherche');
  };

  // Vérifier s'il y a des filtres actifs
  const hasActiveFilters = useMemo(() => {
    return !!(searchCity || professionId || minRating || maxPrice || mapBounds || sortBy !== "rating");
  }, [searchCity, professionId, minRating, maxPrice, mapBounds, sortBy]);

  // Hook de géolocalisation
  const {
    cityName: detectedCity,
    isLoading: locationLoading,
    error: locationError,
    permission: locationPermission,
    getCurrentPosition
  } = useGeolocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState(searchCity);

  // Fetch des professions disponibles selon la localisation
  const boundsParam = mapBounds 
    ? `${mapBounds.north},${mapBounds.south},${mapBounds.east},${mapBounds.west}`
    : null;
  
  const { data: availableProfessionsData, isLoading: isLoadingAvailableProfessions } = useSWR<{ ids: string[]; counts: Record<string, number> }>(
    searchCity || boundsParam 
      ? `/api/professions/available?${searchCity ? `city=${encodeURIComponent(searchCity)}` : ''}${boundsParam ? `${searchCity ? '&' : ''}bounds=${boundsParam}` : ''}`
      : null,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch available professions');
      return res.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );

  const ratingRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const professionRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<{ top: number; left: number; width: number; align: "left" | "right" } | null>(null);
  const cityContainerRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const filtersDropdownRef = useRef<HTMLDivElement>(null);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const { query, setQuery, suggestions, isLoading, selectSuggestion, reset } = useCitySearch({
    value: cityInput,
    onChange: setCityInput,
    onCitySelected: useCallback(
      (s) => {
        // Supprimer bounds pour forcer la recherche par ville (évite conflit France vs Namur/BE)
        updateURL({ city: s.displayLabel, bounds: null });
        onCitySelected?.(s.coords);
      },
      [onCitySelected]
    ),
    debounceMs: 300,
    minChars: 3,
  });

  const closeCitySuggestions = useCallback(() => setShowCitySuggestions(false), []);
  useOnClickOutside(cityContainerRef, closeCitySuggestions, [cityDropdownRef]);

  // Mettre à jour la position du dropdown pour le Portal
  const updateDropdownPosition = useCallback(() => {
    if (cityContainerRef.current) {
      const rect = cityContainerRef.current.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (showCitySuggestions && (suggestions.length > 0 || isLoading)) {
      updateDropdownPosition();
      const handleUpdate = () => updateDropdownPosition();
      window.addEventListener("scroll", handleUpdate, true);
      window.addEventListener("resize", handleUpdate);
      return () => {
        window.removeEventListener("scroll", handleUpdate, true);
        window.removeEventListener("resize", handleUpdate);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [showCitySuggestions, suggestions.length, isLoading, updateDropdownPosition]);

  // Sync cityInput avec searchCity (URL) au chargement ou quand l'URL change
  useEffect(() => {
    if (searchCity) {
      setCityInput(searchCity);
    }
  }, [searchCity]);

  // Mettre à jour l'input quand une ville est détectée par géolocalisation
  useEffect(() => {
    if (detectedCity && detectedCity !== 'Ville inconnue') {
      setCityInput(detectedCity);
      updateURL({ city: detectedCity });
      onLocationDetected?.(detectedCity);
    }
  }, [detectedCity, onLocationDetected]);

  // Mettre à jour la position du dropdown pour Portal (rating, price, profession, sort)
  const updateDropdownAnchor = useCallback((type: string) => {
    const ref = type === "rating" ? ratingRef : type === "price" ? priceRef : type === "profession" ? professionRef : sortRef;
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownAnchor({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        align: type === "sort" ? "right" : "left",
      });
    }
  }, []);

  // Close dropdowns when clicking outside (exclure le portal des dropdowns)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger =
        ratingRef.current?.contains(target) ||
        priceRef.current?.contains(target) ||
        professionRef.current?.contains(target) ||
        sortRef.current?.contains(target);
      const insidePortal = filtersDropdownRef.current?.contains(target);
      if (openDropdown && !insideTrigger && !insidePortal) {
        setOpenDropdown(null);
        setDropdownAnchor(null);
      }
    };

    if (openDropdown) {
      updateDropdownAnchor(openDropdown);
      const handleUpdate = () => updateDropdownAnchor(openDropdown);
      window.addEventListener("scroll", handleUpdate, true);
      window.addEventListener("resize", handleUpdate);
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        window.removeEventListener("scroll", handleUpdate, true);
        window.removeEventListener("resize", handleUpdate);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    } else {
      setDropdownAnchor(null);
    }
  }, [openDropdown, updateDropdownAnchor]);

  const selectedRating = ratingOptions.find((r) => r.value === minRating);
  const selectedSort = sortOptions.find((s) => s.value === sortBy);

  // Options profession pour le dropdown
  const professionOptions = useMemo(() => {
    const availableProfessionIds = availableProfessionsData?.ids || [];
    const professionCountsInZone = availableProfessionsData?.counts || {};
    const hasLocation = searchCity || boundsParam;
    const hasData = availableProfessionsData !== undefined;
    const isLoading = isLoadingAvailableProfessions;

    if (hasLocation && isLoading) {
      return professions.map((prof) => ({
        value: prof.id,
        label: `${prof.name}${prof.practitionerCount ? ` (${prof.practitionerCount})` : ''}`,
        count: prof.practitionerCount ?? 0,
        disabled: false,
        unavailable: false,
      }));
    }

    if (hasLocation && hasData) {
      const filteredProfessions = professions.filter((prof) => {
        const isAvailable = availableProfessionIds.includes(prof.id);
        const isSelected = professionId === prof.id;
        return isAvailable || isSelected;
      });

      return filteredProfessions.map((prof) => {
        const isAvailable = availableProfessionIds.includes(prof.id);
        const isSelected = professionId === prof.id;
        const count = professionCountsInZone[prof.id] ?? prof.practitionerCount ?? 0;
        return {
          value: prof.id,
          label: `${prof.name} (${count})`,
          count,
          disabled: !isAvailable && !isSelected,
          unavailable: !isAvailable && isSelected,
        };
      });
    }

    return professions.map((prof) => ({
      value: prof.id,
      label: `${prof.name}${prof.practitionerCount ? ` (${prof.practitionerCount})` : ''}`,
      count: prof.practitionerCount ?? 0,
      disabled: false,
      unavailable: false,
    }));
  }, [professions, professionId, searchCity, boundsParam, availableProfessionsData, isLoadingAvailableProfessions]);

  return (
    <div className="bg-[#faf8f4]/90 backdrop-blur-md border-b border-gray-100 py-4 px-4 sm:px-6 lg:px-8 relative z-[1000] overflow-visible">
      <div 
        className="flex items-center gap-3 px-2 overflow-x-auto overflow-y-visible pb-1 -mx-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" 
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Location Search - useCitySearch + Portal pour z-index au-dessus de la carte */}
        <div ref={cityContainerRef} className="flex-shrink-0 min-w-[200px] relative">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-full shadow-sm min-w-[200px] pr-2">
            <MapPin className="ml-3 h-4 w-4 text-[#9bb49b] flex-shrink-0 pointer-events-none" />
            <Input
              type="text"
              placeholder="Où cherchez-vous ?"
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                setShowCitySuggestions(v.length >= 3);
              }}
              onFocus={() => {
                if (query.length >= 3 && suggestions.length > 0) setShowCitySuggestions(true);
              }}
              className="flex-1 min-w-0 pl-3 pr-8 py-2 h-9 border-0 bg-transparent focus:ring-0 focus:outline-none text-sm placeholder:text-gray-400"
            />
            {searchCity && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  reset();
                  setShowCitySuggestions(false);
                  setCityInput("");
                  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
                  params.delete("city");
                  params.delete("bounds");
                  params.delete("page");
                  router.push(`/recherche?${params.toString()}`);
                }}
                className="absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                aria-label="Effacer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  const loc = await getCurrentPosition();
                  if (loc?.cityName && loc.cityName !== "Ville inconnue" && loc.lat && loc.lng) {
                    setCityInput(loc.cityName);
                    setQuery(loc.cityName);
                    updateURL({ city: loc.cityName, bounds: null });
                    onCitySelected?.({ lat: loc.lat, lng: loc.lng });
                    onLocationDetected?.(loc.cityName);
                  }
                } catch (e) {
                  console.error("Géolocalisation:", e);
                }
              }}
              disabled={locationLoading}
              className={`p-1.5 rounded-full flex-shrink-0 ${
                locationLoading ? "text-gray-400 cursor-not-allowed" : "text-[#9bb49b] hover:bg-[#9bb49b]/10"
              }`}
              title="Utiliser ma position"
            >
              <Navigation className={`h-4 w-4 ${locationLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Suggestions via Portal - au-dessus de TOUS les éléments (carte Mapbox, filtres) */}
          {typeof document !== "undefined" &&
            showCitySuggestions &&
            (suggestions.length > 0 || isLoading) &&
            dropdownPosition &&
            createPortal(
              <div
                ref={cityDropdownRef}
                className="fixed bg-white rounded-xl shadow-lg border border-[#9bb49b] max-h-60 overflow-y-auto z-[1500] min-w-[200px]"
                style={{
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: Math.max(dropdownPosition.width, 200),
                  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                {isLoading ? (
                  <div className="px-4 py-3 text-center text-sm text-gray-500">Recherche en cours...</div>
                ) : (
                  suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectSuggestion(s);
                        setShowCitySuggestions(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-[#9bb49b]/10 flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <MapPin className="h-4 w-4 text-anthracite/60 flex-shrink-0" />
                      <span className="text-anthracite">{s.displayLabel}</span>
                    </button>
                  ))
                )}
              </div>,
              document.body
            )}
        </div>

        {/* Profession - dropdown simple comme les autres */}
        <div className="flex-shrink-0 relative" ref={professionRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenDropdown(openDropdown === "profession" ? null : "profession");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md ${
              professionId
                ? "bg-[#9bb49b] text-white border-transparent"
                : "bg-white text-gray-700 border border-gray-200 shadow-sm"
            }`}
          >
            <span className="truncate max-w-[140px]">
              {professionOptions.find((p) => p.value === professionId)?.label || "Profession"}
            </span>
            {professionId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateURL({ professionId: null });
                }}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Rating Filter Chip */}
        <div className="flex-shrink-0 relative" ref={ratingRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenDropdown(openDropdown === "rating" ? null : "rating");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md ${
              minRating
                ? "bg-[#9bb49b] text-white border-transparent"
                : "bg-white text-gray-700 border border-gray-200 shadow-sm"
            }`}
          >
            <span>{selectedRating?.label || "Note"}</span>
            {minRating && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateURL({ minRating: null });
                }}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Price Filter Chip */}
        <div className="flex-shrink-0 relative" ref={priceRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenDropdown(openDropdown === "price" ? null : "price");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md ${
              maxPrice
                ? "bg-[#9bb49b] text-white border-transparent"
                : "bg-white text-gray-700 border border-gray-200 shadow-sm"
            }`}
          >
            <span>{maxPrice ? `Max ${maxPrice}€` : "Prix max"}</span>
            {maxPrice && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateURL({ maxPrice: null });
                }}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Bouton Réinitialiser - Visible seulement si des filtres sont actifs */}
        {hasActiveFilters && (
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Réinitialiser</span>
            </button>
          </div>
        )}

        {/* Sort - Pushed to the right */}
        <div className="flex-shrink-0 ml-auto relative" ref={sortRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenDropdown(openDropdown === "sort" ? null : "sort");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-200 shadow-sm hover:shadow-md transition-all"
          >
            <span>Trier par: <strong>{selectedSort?.label}</strong></span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Dropdowns via Portal - au-dessus de tout (carte, etc.) */}
      {typeof document !== "undefined" &&
        openDropdown &&
        dropdownAnchor &&
        createPortal(
          <div
            ref={filtersDropdownRef}
            className="fixed bg-white rounded-2xl shadow-lg border border-gray-100 z-[1500] min-w-[180px] max-h-[400px] overflow-y-auto"
            style={{
              top: dropdownAnchor.top,
              left: dropdownAnchor.align === "right" ? undefined : dropdownAnchor.left,
              right: dropdownAnchor.align === "right" ? window.innerWidth - dropdownAnchor.left - dropdownAnchor.width : undefined,
              width: Math.max(dropdownAnchor.width, 180),
            }}
          >
            {openDropdown === "rating" && (
              <div className="py-2">
                {ratingOptions.map((option) => (
                  <button
                    key={option.value || "all"}
                    type="button"
                    onClick={() => {
                      updateURL({ minRating: option.value });
                      setOpenDropdown(null);
                      setDropdownAnchor(null);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      minRating === option.value ? "text-[#9bb49b] font-medium" : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {openDropdown === "price" && (
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix maximum (€)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => updateURL({ maxPrice: e.target.value || null })}
                  placeholder="Ex: 100"
                  min="0"
                  className="w-full px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#9bb49b] focus:border-transparent"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      updateURL({ maxPrice: "50" });
                      setOpenDropdown(null);
                      setDropdownAnchor(null);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700"
                  >
                    50€
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateURL({ maxPrice: "100" });
                      setOpenDropdown(null);
                      setDropdownAnchor(null);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700"
                  >
                    100€
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateURL({ maxPrice: "150" });
                      setOpenDropdown(null);
                      setDropdownAnchor(null);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700"
                  >
                    150€
                  </button>
                </div>
              </div>
            )}
            {openDropdown === "profession" && (
              <div className="py-2">
                <button
                  type="button"
                  onClick={() => {
                    updateURL({ professionId: null });
                    setOpenDropdown(null);
                    setDropdownAnchor(null);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    !professionId ? "text-[#9bb49b] font-medium" : "text-gray-700"
                  }`}
                >
                  Toutes les professions
                </button>
                {professionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (opt.disabled) return;
                      updateURL({ professionId: professionId === opt.value ? null : opt.value });
                      setOpenDropdown(null);
                      setDropdownAnchor(null);
                    }}
                    disabled={opt.disabled}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      opt.disabled ? "opacity-50 cursor-not-allowed text-gray-400" : "hover:bg-gray-50 text-gray-700"
                    } ${professionId === opt.value && !opt.unavailable ? "text-[#9bb49b] font-medium" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {openDropdown === "sort" && (
              <div className="py-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      updateURL({ sortBy: option.value });
                      setOpenDropdown(null);
                      setDropdownAnchor(null);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      sortBy === option.value ? "text-[#9bb49b] font-medium" : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

