"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Stethoscope } from "lucide-react";

interface Suggestion {
  type: "profession" | "practitioner";
  label: string;
  slug: string;
  id?: string;
}

interface MegaMenuSearchInputProps {
  onClose: () => void;
}

export function MegaMenuSearchInput({ onClose }: MegaMenuSearchInputProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const isClickingRef = useRef(false);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setHighlightedIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    const t = setTimeout(() => fetchSuggestions(query), 300);
    return () => clearTimeout(t);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isClickingRef.current) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (s: Suggestion) => {
      isClickingRef.current = true;
      setOpen(false);
      setQuery("");
      setSuggestions([]);
      onClose();
      if (s.type === "practitioner" && s.slug) {
        router.push(`/praticien/${s.slug}`);
      } else if (s.type === "profession" && s.id) {
        router.push(`/recherche?professionId=${s.id}`);
      } else if (s.type === "profession") {
        router.push(`/recherche?profession=${encodeURIComponent(s.slug)}`);
      }
      setTimeout(() => { isClickingRef.current = false; }, 50);
    },
    [router, onClose]
  );

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;
    setOpen(false);
    onClose();
    router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
  }, [query, router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") handleSubmit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const showDropdown = open && (suggestions.length > 0 || loading);

  return (
    <div ref={containerRef} className="relative w-[400px] flex-shrink-0">
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-4 w-4 text-slate-400 shrink-0 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un métier, une ville, un sujet…"
          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-slate-50 border border-gray-200 text-sm text-anthracite placeholder:text-slate-500 hover:bg-slate-100/80 focus:outline-none focus:ring-2 focus:ring-sauge/30 focus:border-sauge/50 transition-colors"
          aria-label="Recherche prédictive"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
      </div>
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 py-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[10001] max-h-72 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Recherche en cours…</div>
          ) : (
            suggestions.map((s, i) => {
              const Icon = s.type === "practitioner" ? User : Stethoscope;
              return (
                <button
                  key={`${s.type}-${s.slug}-${i}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    isClickingRef.current = true;
                  }}
                  onClick={() => handleSelect(s)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    i === highlightedIndex ? "bg-sauge/10 text-sauge" : "hover:bg-gray-50 text-anthracite"
                  }`}
                >
                  <Icon className="h-4 w-4 text-[#9bb49b] flex-shrink-0" />
                  <span className="truncate flex-1 text-sm">{s.label}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {s.type === "practitioner" ? "Praticien" : "Profession"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
