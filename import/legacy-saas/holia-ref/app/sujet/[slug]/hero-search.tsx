"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Skeleton } from "@/components/ui";

interface SubjectHeroSearchProps {
  subjectSlug: string;
  subjectName: string;
}

export function SubjectHeroSearch({ subjectSlug, subjectName }: SubjectHeroSearchProps) {
  const [cityInput, setCityInput] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<Array<{
    value: string;
    label: string;
    coords: { lat: number; lng: number };
  }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSelectingCity, setIsSelectingCity] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    cityName: detectedCity,
    isLoading: locationLoading,
    getCurrentPosition
  } = useGeolocation();

  // Charger les suggestions depuis l'API Adresse Gouv
  useEffect(() => {
    if (cityInput.length < 3) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cityInput)}&type=municipality&limit=5`
        );
        if (!response.ok) throw new Error("Erreur API");
        const data = await response.json();
        
        const suggestions = data.features
          .filter((feature: any) => feature.properties.type === "municipality")
          .map((feature: any) => ({
            value: feature.properties.city || feature.properties.name,
            label: `${feature.properties.city || feature.properties.name} (${feature.properties.postcode})`,
            coords: {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0]
            }
          }));
        
        setCitySuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0 && !isSelectingCity);
      } catch (error) {
        console.error("Erreur lors de la récupération des suggestions:", error);
        setCitySuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [cityInput, isSelectingCity]);

  // Gérer le clic en dehors pour fermer les suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCitySelect = (city: string) => {
    const normalizedCity = city.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '-');
    router.push(`/sujet/${subjectSlug}/${normalizedCity}`);
  };

  const handleSuggestionClick = (suggestion: { value: string; label: string; coords: { lat: number; lng: number } }) => {
    setIsSelectingCity(true);
    setCityInput(suggestion.value);
    setShowSuggestions(false);
    setTimeout(() => {
      handleCitySelect(suggestion.value);
      setIsSelectingCity(false);
    }, 100);
  };

  const handleUseLocation = () => {
    getCurrentPosition();
  };

  // Mettre à jour l'input quand une ville est détectée (mais ne pas rediriger automatiquement)
  useEffect(() => {
    if (detectedCity && detectedCity !== 'Ville inconnue') {
      setCityInput(detectedCity);
    }
  }, [detectedCity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cityInput.trim()) {
      handleCitySelect(cityInput.trim());
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-anthracite/40" />
          <input
            ref={inputRef}
            type="text"
            value={cityInput}
            onChange={(e) => {
              setCityInput(e.target.value);
              setIsSelectingCity(false);
            }}
            onFocus={() => {
              if (citySuggestions.length > 0 && !isSelectingCity) {
                setShowSuggestions(true);
              }
            }}
            placeholder={`Trouvez un expert en ${subjectName.toLowerCase()} près de chez vous`}
            className="w-full pl-12 pr-32 py-4 text-lg border-2 border-sable/30 rounded-2xl focus:outline-none focus:border-sauge focus:ring-2 focus:ring-sauge/20 transition-all bg-white"
          />
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locationLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 text-sm font-medium text-sauge hover:text-sauge/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Utiliser ma position"
          >
            <Navigation className="h-4 w-4" />
            {locationLoading ? "..." : "Ma position"}
          </button>
        </div>
      </form>

      {/* Suggestions */}
      {showSuggestions && citySuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white border border-sable/30 rounded-xl shadow-lg overflow-hidden"
        >
          {isLoadingSuggestions ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-3/4 rounded-xl" />
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {citySuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-sauge/5 transition-colors flex items-center gap-2 border-b border-sable/10 last:border-b-0"
                >
                  <MapPin className="h-4 w-4 text-anthracite/40 flex-shrink-0" />
                  <span className="text-anthracite">{suggestion.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
