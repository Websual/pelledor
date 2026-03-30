"use client";

import { useGeolocation } from "@/hooks/use-geolocation";
import { useCitySearch } from "@/hooks/use-city-search";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { Input, Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, X, User, Stethoscope, MapPin, Navigation } from "lucide-react";


export function HomeSearchBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [showSpecialtySuggestions, setShowSpecialtySuggestions] = useState(false);
  const specialtyInputRef = useRef<HTMLInputElement>(null);
  const specialtySuggestionsRef = useRef<HTMLDivElement>(null);
  const isClickingSuggestionRef = useRef(false);

  // État pour stocker les données chargées depuis l'API
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // État pour suivre la sélection actuelle (profession ou texte libre)
  const [selectedProfession, setSelectedProfession] = useState<{ name: string; slug: string } | null>(null);
  
  // État pour l'autocomplétion via l'API de suggestions
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{
    type: 'profession' | 'practitioner';
    label: string;
    slug: string;
  }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Charger les données depuis l'API
  useEffect(() => {
    setDataLoaded(true);
  }, []);
  
  // Rechercher via l'API de suggestions quand l'utilisateur tape 2 lettres
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !dataLoaded) {
      setSearchSuggestions([]);
      return;
    }

    const searchSuggestionsAPI = async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`
        );
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        setSearchSuggestions(data.suggestions || []);
      } catch (error) {
        console.error("Erreur lors de la recherche de suggestions:", error);
        setSearchSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    // Debounce pour éviter trop de requêtes
    const timeoutId = setTimeout(searchSuggestionsAPI, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, dataLoaded]);

  // État pour désactiver temporairement l'auto-détection après un clic sur X
  const [autoDetectionDisabled, setAutoDetectionDisabled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Hook de géolocalisation - désactiver autoDetect si on est côté serveur ou si désactivé manuellement
  const {
    cityName: detectedCity,
    isLoading: locationLoading,
    error: locationError,
    permission: locationPermission,
    getCurrentPosition
  } = useGeolocation({ autoDetect: false }); // Désactivé par défaut, on l'activera manuellement côté client

  // S'assurer que le composant est monté côté client avant d'activer la détection
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Activer la détection automatique une fois monté côté client, sauf si désactivée manuellement
  useEffect(() => {
    if (isMounted && !autoDetectionDisabled && !location && typeof window !== 'undefined') {
      // Détecter automatiquement la ville au montage côté client uniquement
      getCurrentPosition().then((result) => {
        if (result?.cityName && result.cityName !== 'Ville inconnue' && !location) {
          setLocation(result.cityName);
          console.log('Ville détectée automatiquement:', result.cityName);
        }
      }).catch((error) => {
        console.log('Auto-détection de ville annulée ou échouée:', error);
      });
    }
  }, [isMounted, autoDetectionDisabled, location, getCurrentPosition]);

  // Utiliser directement les suggestions de l'API
  const specialtySuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1 || !dataLoaded) return [];
    return searchSuggestions.map(suggestion => ({
      value: suggestion.label,
      label: suggestion.label,
      type: suggestion.type,
      slug: suggestion.slug
    }));
  }, [searchQuery, searchSuggestions, dataLoaded]);


  const cityContainerRef = useRef<HTMLDivElement>(null);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const { query, setQuery, suggestions, isLoading, selectSuggestion, reset } = useCitySearch({
    value: location,
    onChange: (v) => setLocation(v),
    onCitySelected: () => setShowCitySuggestions(false),
    debounceMs: 300,
    minChars: 3,
  });

  const closeCitySuggestions = useCallback(() => setShowCitySuggestions(false), []);
  useOnClickOutside(cityContainerRef, closeCitySuggestions);

  // Close specialty suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickingSuggestionRef.current) return;
      const target = event.target as Node;
      if (
        specialtySuggestionsRef.current &&
        !specialtySuggestionsRef.current.contains(target) &&
        specialtyInputRef.current &&
        !specialtyInputRef.current.contains(target)
      ) {
        setShowSpecialtySuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGetLocation = async () => {
    try {
      const locationData = await getCurrentPosition();
      if (locationData?.cityName && locationData.cityName !== 'Ville inconnue') {
        setLocation(locationData.cityName);
        console.log('Ville détectée manuellement:', locationData.cityName);
      } else if (locationData) {
        // Fallback: utiliser les coordonnées pour trier par distance
        router.push(`/recherche?lat=${locationData.lat}&lng=${locationData.lng}&sortBy=distance`);
      }
    } catch (error) {
      console.error('Erreur de géolocalisation:', error);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    // Si une profession est sélectionnée, utiliser professionId au lieu de q
    if (selectedProfession) {
      params.append("professionId", selectedProfession.slug);
    }
    // Sinon, utiliser q pour la recherche textuelle (nom du praticien, profession, etc.)
    else if (searchQuery) {
      params.append("q", searchQuery);
    }
    
    // Nettoyer le nom de la ville (enlever le code départemental si présent)
    const cleanCityName = location.replace(/\s*\(\d{2}\)\s*$/, '').trim();
    if (cleanCityName) {
      params.append("city", cleanCityName);
    }
    
    // Construire l'URL propre
    const searchUrl = `/recherche?${params.toString()}`;
    router.push(searchUrl);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto relative overflow-visible">
      <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-3xl shadow-lg p-2 flex flex-col sm:flex-row gap-2 overflow-visible" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}>
        {/* Input de recherche spécialité */}
        <div className="flex-1 relative" ref={specialtySuggestionsRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-anthracite/40" />
            </div>
            <Input
              ref={specialtyInputRef}
              type="text"
              placeholder="Spécialité, pratique, nom..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSpecialtySuggestions(true);
                // Réinitialiser les sélections si l'utilisateur modifie manuellement le texte
                if (selectedProfession) {
                  setSelectedProfession(null);
                }
              }}
              onFocus={() => setShowSpecialtySuggestions(true)}
              onKeyDown={handleKeyPress}
              className="pl-12 pr-10 h-12 text-base bg-transparent border-0 focus:ring-0 focus:ring-offset-0 focus:border-0 focus:outline-none placeholder:text-anthracite/60"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowSpecialtySuggestions(false);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-anthracite/40 hover:text-anthracite" />
              </button>
            )}
          </div>
        </div>

        {/* Séparateur */}
        <div className="hidden sm:block w-px bg-[#9bb49b]/30 self-stretch"></div>

        {/* Input de localisation - design nu, useCitySearch */}
        <div ref={cityContainerRef} className="flex-1 relative overflow-visible">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-anthracite/40" />
            </div>
            <Input
              type="text"
              placeholder="Ville..."
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                setShowCitySuggestions(v.length >= 3);
              }}
              onFocus={() => {
                if (query.length >= 3 && suggestions.length > 0) setShowCitySuggestions(true);
              }}
              onKeyDown={handleKeyPress}
              className="pl-12 pr-20 h-12 text-base bg-transparent border-0 focus:ring-0 focus:ring-offset-0 focus:border-0 focus:outline-none placeholder:text-anthracite/60"
              style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif", letterSpacing: "-0.01em" }}
            />
            {location && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  reset();
                  setShowCitySuggestions(false);
                  setAutoDetectionDisabled(true);
                }}
                className="absolute inset-y-0 right-12 pr-2 flex items-center"
                aria-label="Effacer"
              >
                <X className="h-4 w-4 text-anthracite/40 hover:text-anthracite" />
              </button>
            )}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locationLoading}
              className={`absolute inset-y-0 right-0 pr-4 flex items-center ${
                locationLoading ? "text-anthracite/40 cursor-not-allowed" :
                locationPermission === "denied" ? "text-red-500" :
                "text-anthracite/60 hover:text-anthracite"
              }`}
              title={locationPermission === "denied" ? "Géolocalisation refusée" : "Utiliser ma position"}
            >
              <Navigation className={`h-4 w-4 ${locationLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {/* Liste suggestions - z-[100], position absolute pour flotter au-dessus des sections Besoins */}
          {showCitySuggestions && (suggestions.length > 0 || isLoading) && (
            <div
              className="absolute z-[100] w-full mt-1 bg-white/95 backdrop-blur-sm border border-[#9bb49b] rounded-xl shadow-lg max-h-60 overflow-y-auto left-0 top-full"
              style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif", letterSpacing: "-0.01em" }}
            >
              {isLoading ? (
                <div className="px-4 py-3 text-center text-sm text-anthracite/60">Recherche en cours...</div>
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
                    className="w-full text-left px-4 py-3 hover:bg-[#9bb49b]/10 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-anthracite/60 flex-shrink-0" />
                    <span className="text-anthracite">{s.displayLabel}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Bouton Rechercher – même effet que Teasing Pro (saugeFill) */}
        <Button
          onClick={handleSearch}
          variant="saugeFill"
          className="h-12"
          style={{ padding: "0.75rem 1.5rem", fontFamily: "Inter, system-ui, -apple-system, sans-serif", letterSpacing: "-0.01em" }}
        >
          Rechercher
          <Search className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Suggestions spécialité - position absolute, z-[100] pour flotter au-dessus */}
      {showSpecialtySuggestions && (specialtySuggestions.length > 0 || isLoadingSuggestions) && (
        <div className="absolute z-[100] w-full mt-1 bg-white/95 backdrop-blur-sm border border-[#9bb49b] rounded-xl shadow-lg max-h-60 overflow-y-auto" style={{ top: '100%', left: 0 }}>
          {isLoadingSuggestions && (
            <div className="px-4 py-3 text-center text-sm text-anthracite/60">
              Recherche en cours...
            </div>
          )}
          {!isLoadingSuggestions && specialtySuggestions.map((suggestion, index) => {
            // Déterminer l'icône selon le type
            const IconComponent = suggestion.type === 'profession' 
              ? Stethoscope 
              : User;
            
            return (
              <button
                key={index}
                type="button"
                onMouseDown={(e) => {
                  // Empêcher le blur de l'input de se déclencher avant le clic
                  e.preventDefault();
                  isClickingSuggestionRef.current = true;
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Si c'est un praticien, rediriger directement vers sa fiche
                  if (suggestion.type === 'practitioner' && suggestion.slug) {
                    router.push(`/praticien/${suggestion.slug}`);
                    return;
                  }
                  
                  // Pour les professions, mettre à jour l'input et préparer la recherche
                  const selectedValue = suggestion.label;
                  if (specialtyInputRef.current) {
                    specialtyInputRef.current.value = selectedValue;
                  }
                  
                  // Mettre à jour l'état React
                  setSearchQuery(selectedValue);
                  
                  // Enregistrer la sélection selon le type
                  if (suggestion.type === 'profession' && suggestion.slug) {
                    setSelectedProfession({ name: suggestion.label, slug: suggestion.slug });
                  } else {
                    // Texte libre, réinitialiser les sélections
                    setSelectedProfession(null);
                  }
                  
                  // Fermer les suggestions immédiatement
                  setShowSpecialtySuggestions(false);
                  isClickingSuggestionRef.current = false;
                  
                  // Retirer le focus de l'input après sélection
                  setTimeout(() => {
                    specialtyInputRef.current?.blur();
                  }, 10);
                }}
                className="w-full text-left px-4 py-3 hover:bg-[#9bb49b]/10 transition-colors flex items-center gap-2 cursor-pointer"
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
              >
                <IconComponent className="h-4 w-4 text-anthracite/60" />
                <span className="text-anthracite">{suggestion.label}</span>
                {suggestion.type === 'profession' && (
                  <span className="ml-auto text-xs text-anthracite/40">Profession</span>
                )}
                {suggestion.type === 'practitioner' && (
                  <span className="ml-auto text-xs text-anthracite/40">Praticien</span>
                )}
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
}

