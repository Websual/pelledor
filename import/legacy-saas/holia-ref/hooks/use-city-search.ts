"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface CitySuggestion {
  value: string;
  label: string;
  displayLabel: string;
  coords: { lat: number; lng: number };
  postcode?: string;
}

/** Logique de recherche ville : Adresse Gouv (FR) + Mapbox fallback (BE, CH, LU, etc.) */
async function searchCities(query: string): Promise<CitySuggestion[]> {
  const uniqueCities = new Map<
    string,
    { label: string; displayLabel: string; coords: { lat: number; lng: number }; postcode?: string }
  >();

  // 1. Adresse Gouv (France)
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=8`
    );
    if (res.ok) {
      const data = await res.json();
      (data.features || []).forEach((feature: any) => {
        if (!feature?.geometry?.coordinates) return;
        const cityName =
          feature.properties?.city || feature.properties?.name || feature.properties?.label;
        if (!cityName) return;
        const [lng, lat] = feature.geometry.coordinates;
        if (lat >= 41 && lat <= 51 && lng >= -5 && lng <= 10) {
          const postcode = feature.properties?.postcode || "";
          const dept = postcode ? postcode.substring(0, 2) : "";
          const displayLabel = dept ? `${cityName} (${dept})` : cityName;
          const key = `${cityName}_${dept}`;
          if (!uniqueCities.has(key)) {
            uniqueCities.set(key, { label: cityName, displayLabel, coords: { lat, lng }, postcode });
          }
        }
      });
    }
  } catch {
    // continuer avec Mapbox
  }

  let suggestions = Array.from(uniqueCities.values()).map((d) => ({
    value: d.label,
    label: d.label,
    displayLabel: d.displayLabel,
    coords: d.coords,
    postcode: d.postcode,
  }));

  // 2. Fallback Mapbox si 0 résultat (villes internationales francophones)
  if (suggestions.length === 0) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (token) {
      try {
        const mbRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=place,locality&limit=8&language=fr&access_token=${token}`,
          { headers: { "Accept-Language": "fr" } }
        );
        if (mbRes.ok) {
          const mbData = await mbRes.json();
          const seen = new Set<string>();
          const labels: Record<string, string> = {
            FR: "France",
            BE: "Belgique",
            CH: "Suisse",
            LU: "Luxembourg",
            MC: "Monaco",
          };
          for (const f of mbData.features || []) {
            if (!f.center?.length) continue;
            const [lng, lat] = f.center;
            if (lat < 43 || lat > 52 || lng < -5 || lng > 11) continue;
            const cityName = f.text || f.place_name?.split(",")?.[0] || "";
            if (!cityName) continue;
            const ctx = f.context || [];
            const cc = (
              ctx.find((c: any) => c.id?.startsWith("country"))?.short_code || "FR"
            ).toUpperCase();
            if (!["FR", "BE", "CH", "LU", "MC"].includes(cc)) continue;
            const postcode = ctx.find((c: any) => c.id?.startsWith("postcode"))?.text || "";
            const displayLabel =
              cc === "FR" && postcode
                ? `${cityName} (${postcode.substring(0, 2)})`
                : `${cityName} (${labels[cc] || cc})`;
            const key = `${cityName}_${cc}_${postcode}`;
            if (seen.has(key)) continue;
            seen.add(key);
            suggestions.push({
              value: cityName,
              label: cityName,
              displayLabel,
              coords: { lat, lng },
              postcode,
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return suggestions;
}

export interface UseCitySearchOptions {
  /** Callback appelé quand l'utilisateur sélectionne une suggestion */
  onCitySelected?: (suggestion: CitySuggestion) => void;
  /** Délai de debounce en ms (défaut 300) */
  debounceMs?: number;
  /** Nombre minimum de caractères pour lancer la recherche (défaut 3) */
  minChars?: number;
  /** En mode contrôlé : valeur fournie par le parent */
  value?: string;
  /** En mode contrôlé : appelé quand la query change */
  onChange?: (value: string) => void;
}

export function useCitySearch(options: UseCitySearchOptions = {}) {
  const {
    onCitySelected,
    debounceMs = 300,
    minChars = 3,
    value: controlledValue,
    onChange: controlledOnChange,
  } = options;

  const [internalQuery, setInternalQuery] = useState("");
  const isControlled = controlledValue !== undefined;
  const query = isControlled ? controlledValue : internalQuery;
  const setQuery = useCallback(
    (v: string | ((prev: string) => string)) => {
      const next = typeof v === "function" ? v(query) : v;
      if (controlledOnChange) controlledOnChange(next);
      if (!isControlled) setInternalQuery(next);
    },
    [isControlled, controlledOnChange, query]
  );
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const lastSelectedRef = useRef<string | null>(null);
  const isSelectingRef = useRef(false);

  const reset = useCallback(() => {
    setSuggestions([]);
    lastSelectedRef.current = null;
    isSelectingRef.current = false;
  }, []);

  const selectSuggestion = useCallback(
    (suggestion: CitySuggestion) => {
      isSelectingRef.current = true;
      setQuery(suggestion.displayLabel);
      setSuggestions([]);
      lastSelectedRef.current = suggestion.displayLabel;
      onCitySelected?.(suggestion);
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 150);
    },
    [onCitySelected]
  );

  useEffect(() => {
    if (isSelectingRef.current) return;
    if (lastSelectedRef.current && query === lastSelectedRef.current) return;
    if (!query || query.length < minChars) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchCities(query);
        if (!isSelectingRef.current && (!lastSelectedRef.current || query !== lastSelectedRef.current)) {
          setSuggestions(results);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(t);
  }, [query, minChars, debounceMs]);

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    selectSuggestion,
    reset,
  };
}
