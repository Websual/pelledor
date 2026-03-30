"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Stethoscope } from "lucide-react";

interface Suggestion {
  type: "profession" | "practitioner";
  label: string;
  slug: string;
  id?: string;
}

interface NavbarSearchInputProps {
  className?: string;
  placeholder?: string;
  showShortcutHint?: boolean;
}

export const NavbarSearchInput = forwardRef<HTMLInputElement | null, NavbarSearchInputProps>(
  function NavbarSearchInput({ className = "", placeholder = "Rechercher un praticien...", showShortcutHint = false }, ref) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const isClickingSuggestionRef = useRef(false);

    useImperativeHandle(ref, () => inputRef.current);

    const fetchSuggestions = useCallback(async (q: string) => {
      if (!q || q.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(q.trim())}`
        );
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setHighlightedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      if (!query || query.trim().length < 3) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      setIsOpen(true);
      const t = setTimeout(() => fetchSuggestions(query), 300);
      return () => clearTimeout(t);
    }, [query, fetchSuggestions]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (isClickingSuggestionRef.current) return;
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (s: Suggestion) => {
      isClickingSuggestionRef.current = true;
      setIsOpen(false);
      setQuery("");
      if (s.type === "practitioner" && s.slug) {
        router.push(`/praticien/${s.slug}`);
      } else if (s.type === "profession" && s.id) {
        router.push(`/recherche?professionId=${s.id}`);
      } else if (s.type === "profession") {
        router.push(`/recherche?professionId=${s.slug}`);
      }
      setTimeout(() => { isClickingSuggestionRef.current = false; }, 50);
    };

    const handleSubmit = () => {
      if (!query.trim()) return;
      setIsOpen(false);
      router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) {
        if (e.key === "Enter") handleSubmit();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) =>
          i < suggestions.length - 1 ? i + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) =>
          i > 0 ? i - 1 : suggestions.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        } else {
          handleSubmit();
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    const showDropdown = isOpen && (suggestions.length > 0 || isLoading);

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-anthracite/50 flex-shrink-0 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 3) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full pl-9 py-2 rounded-full bg-white/60 hover:bg-white/80 border border-gray-200/60 text-sm text-anthracite placeholder:text-anthracite/50 focus:outline-none focus:ring-2 focus:ring-sauge/30 focus:border-sauge/50 transition-colors ${
              showShortcutHint ? "pr-14" : "pr-3"
            }`}
            aria-label="Rechercher un praticien"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="navbar-search-suggestions"
          />
          {showShortcutHint && !query && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-anthracite/40 bg-white/80 rounded border border-gray-200/60">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </div>

        {showDropdown && (
          <div
            id="navbar-search-suggestions"
            className="absolute top-full left-0 right-0 mt-1 py-1 bg-white rounded-xl border border-gray-200 shadow-lg z-[9999] max-h-72 overflow-y-auto"
          >
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-anthracite/60">
                Recherche en cours...
              </div>
            ) : (
              suggestions.map((s, i) => {
                const Icon =
                  s.type === "practitioner" ? User : Stethoscope;
                return (
                  <button
                    key={`${s.type}-${s.slug}-${i}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      isClickingSuggestionRef.current = true;
                    }}
                    onClick={() => handleSelect(s)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors ${
                      i === highlightedIndex
                        ? "bg-sauge/10 text-sauge"
                        : "hover:bg-gray-50 text-anthracite"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-anthracite/50 flex-shrink-0" />
                    <span className="truncate flex-1">{s.label}</span>
                    <span className="text-xs text-anthracite/40 flex-shrink-0">
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
);
