"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import type { DocTarget } from "@/lib/mdx";

interface SearchResult {
  profile: string;
  category: { id: string; label: string };
  article: { slug: string; title: string; target: string };
}

export function AideSearch({ profile }: { profile: DocTarget }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/aide/search?q=${encodeURIComponent(query)}&profile=${profile}`)
        .then((r) => r.json())
        .then((data) => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(timer);
  }, [query, profile]);

  const showDropdown = focused && query.length >= 2;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative mb-8">
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-anthracite/40" />
        <input
          type="search"
          placeholder="Rechercher dans la documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          className="w-full pl-12 pr-4 py-3 rounded-3xl border border-gray-200 bg-white text-anthracite placeholder:text-anthracite/40 focus:outline-none focus:ring-2 focus:ring-sauge/50 focus:border-sauge"
        />
      </div>
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 max-w-xl bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden z-50">
          {loading ? (
            <div className="px-4 py-6 text-center text-anthracite/60 text-sm">Recherche...</div>
          ) : results.length > 0 ? (
            <ul className="py-2">
              {results.map(({ category, article }) => (
                <li key={`${category.id}-${article.slug}`}>
                  <Link
                    href={`/aide/${profile}/${category.id}/${article.slug}`}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-sauge/10 transition-colors"
                    onClick={() => setFocused(false)}
                  >
                    <span className="font-medium text-anthracite flex-1 truncate">
                      {article.title}
                    </span>
                    <span
                      className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        article.target === "pro"
                          ? "bg-sauge/20 text-sauge"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {article.target === "pro" ? "PRO" : "PATIENT"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-anthracite/60 text-sm">
              Aucun article trouvé pour &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
