"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapPin, X, Navigation } from "lucide-react";
import { useCitySearch, type CitySuggestion } from "@/hooks/use-city-search";

export type { CitySuggestion };

interface CitySearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onCitySelected?: (suggestion: CitySuggestion) => void;
  placeholder?: string;
  showGeolocation?: boolean;
  onGeolocationClick?: () => void | Promise<void>;
  locationLoading?: boolean;
  locationPermission?: "granted" | "denied" | "prompt" | null;
  showClear?: boolean;
  onClear?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  inputClassName?: string;
  dropdownWidth?: string;
}

export function CitySearchInput({
  value,
  onChange,
  onCitySelected,
  placeholder = "Ville...",
  showGeolocation = true,
  onGeolocationClick,
  locationLoading = false,
  locationPermission = null,
  showClear = false,
  onClear,
  onKeyDown,
  className = "",
  inputClassName = "",
  dropdownWidth = "min-w-[280px]",
}: CitySearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { query, setQuery, suggestions, isLoading, selectSuggestion, reset } = useCitySearch({
    value,
    onChange,
    onCitySelected,
    debounceMs: 300,
    minChars: 3,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: CitySuggestion) => {
    setShowSuggestions(false);
    selectSuggestion(s);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery("");
    reset();
    setShowSuggestions(false);
    onClear?.();
  };

  return (
    <div ref={containerRef} className={`relative overflow-visible ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9bb49b] z-10 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setShowSuggestions(v.length >= 3);
          }}
          onFocus={() => {
            if (query.length >= 3 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          onKeyDown={onKeyDown}
          className={`pl-10 pr-12 py-2 rounded-full bg-white border border-gray-200 text-sm text-[#2f2f2f] placeholder:text-gray-400 focus:ring-0 focus:outline-none shadow-sm ${inputClassName}`}
        />
        {showClear && query && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleClear();
            }}
            className="absolute right-10 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Effacer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {showGeolocation && (
          <button
            type="button"
            onClick={onGeolocationClick}
            disabled={locationLoading}
            className={`absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center ${
              locationLoading ? "bg-gray-100 text-gray-400 cursor-not-allowed" :
              locationPermission === "denied" ? "bg-red-100 text-red-500" :
              "bg-[#9bb49b]/10 text-[#9bb49b] hover:bg-[#9bb49b]/20"
            }`}
            title={locationPermission === "denied" ? "Géolocalisation refusée" : "Utiliser ma position"}
          >
            <Navigation className={`h-3 w-3 ${locationLoading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {/* Dropdown : z-[100], position absolute, overflow-visible parent */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div
          className={`absolute top-full left-0 mt-2 bg-white/95 backdrop-blur-sm border border-[#9bb49b] rounded-xl shadow-lg max-h-60 overflow-y-auto z-[100] ${dropdownWidth}`}
          style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif", letterSpacing: "-0.01em" }}
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
                  handleSelect(s);
                }}
                className="w-full text-left px-4 py-3 hover:bg-[#9bb49b]/10 flex items-center gap-2 cursor-pointer"
              >
                <MapPin className="h-4 w-4 text-anthracite/60 flex-shrink-0" />
                <span className="text-anthracite">{s.displayLabel}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
