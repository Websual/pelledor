"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin } from "lucide-react";

interface AddressSuggestion {
  label: string;
  city: string;
  coords: { lat: number; lng: number };
}

/** Recherche adresse : Adresse Gouv (FR) puis Mapbox (BE, CH, LU, etc.) pour les bonnes coordonnées */
async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const items: AddressSuggestion[] = [];

  // 1. France : API Adresse Gouv
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=8`
    );
    const data = await res.json();
    (data.features || []).forEach((f: any) => {
      if (!f?.geometry?.coordinates) return;
      const [lng, lat] = f.geometry.coordinates;
      const label = f.properties?.label || "";
      const city = f.properties?.city || "";
      if (label) items.push({ label, city, coords: { lat, lng } });
    });
  } catch {
    // continuer avec Mapbox
  }

  // 2. Fallback Mapbox si 0 résultat (Belgique, Suisse, Luxembourg, etc.)
  if (items.length === 0) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (token) {
      try {
        const mbRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=address,place,locality&limit=8&language=fr&country=FR,BE,CH,LU,MC&access_token=${token}`,
          { headers: { Accept: "application/json" } }
        );
        if (mbRes.ok) {
          const mbData = await mbRes.json();
          const seen = new Set<string>();
          for (const f of mbData.features || []) {
            if (!f.center?.length) continue;
            const [lng, lat] = f.center;
            const label = f.place_name || "";
            const ctx = f.context || [];
            const placeCtx = ctx.find((c: any) => c.id?.startsWith("place.") || c.id?.startsWith("locality."));
            const city = placeCtx?.text || f.text || "";
            const key = `${label}_${lat}_${lng}`;
            if (seen.has(key) || !label) continue;
            seen.add(key);
            items.push({ label, city, coords: { lat, lng } });
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return items;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, coords?: { lat: number; lng: number }) => void;
  onSelect?: (data: {
    fullAddress: string;
    city: string;
    lat: number;
    lng: number;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Rechercher une adresse...",
  disabled = false,
  className = "",
  id = "address",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSelectedLabelRef = useRef<string | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!query || query.length < 3 || isSelecting) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const items = await searchAddresses(query);
        setSuggestions(items);
        if (items.length > 0 && query !== lastSelectedLabelRef.current) {
          setIsOpen(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isSelecting]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (s: AddressSuggestion) => {
      lastSelectedLabelRef.current = s.label;
      setIsSelecting(true);
      setIsOpen(false);
      setSuggestions([]);
      setQuery(s.label);
      onChange(s.label, s.coords);
      onSelect?.({
        fullAddress: s.label,
        city: s.city,
        lat: s.coords.lat,
        lng: s.coords.lng,
      });
      setTimeout(() => setIsSelecting(false), 400);
    },
    [onChange, onSelect]
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-anthracite/50 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (v !== lastSelectedLabelRef.current) {
              lastSelectedLabelRef.current = null;
              onChange(v);
            }
          }}
          onFocus={() => query.length >= 3 && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm text-anthracite placeholder:text-anthracite/50 focus:outline-none focus:ring-2 focus:ring-sauge/30 focus:border-sauge disabled:opacity-60"
        />
      </div>
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-anthracite/60">Recherche...</div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-sauge/5 transition-colors text-sm"
              >
                <MapPin className="h-4 w-4 text-sauge flex-shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
