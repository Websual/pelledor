"use client";

import { useMemo, useState } from "react";
import type { BlockType } from "@/core/builder/block-types";
import { BLOCK_ICONS, BLOCK_LABELS } from "@/core/builder/block-types";
import { PATTERN_DEFINITIONS } from "@/core/builder/patterns";

const BLOCK_GROUPS: { label: string; types: BlockType[] }[] = [
  { label: "Contenu", types: ["hero", "heading", "text", "image", "gallery", "separator"] },
  { label: "Conversion", types: ["cta", "services", "faq", "testimonials", "contact-info", "embed"] },
  { label: "Modules", types: ["booking-widget", "click-collect-widget", "quote-form", "restaurant-menu"] },
];

type Tab = "blocks" | "patterns";

type Props = {
  open: boolean;
  onClose: () => void;
  onPickBlock: (type: BlockType) => void;
  onPickPattern: (patternId: string) => void;
};

export function BuilderLibraryModal({ open, onClose, onPickBlock, onPickPattern }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("blocks");

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOCK_GROUPS;
    return BLOCK_GROUPS.map((g) => ({
      ...g,
      types: g.types.filter((t) => BLOCK_LABELS[t].toLowerCase().includes(q)),
    })).filter((g) => g.types.length > 0);
  }, [query]);

  const filteredPatterns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PATTERN_DEFINITIONS;
    return PATTERN_DEFINITIONS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-gray-200">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex-1">Bibliothèque</h2>
          <input
            type="search"
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 max-w-xs border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 px-2"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setTab("blocks")}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              tab === "blocks" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Blocs
          </button>
          <button
            type="button"
            onClick={() => setTab("patterns")}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              tab === "patterns" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sections (patterns)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "blocks" && (
            <div className="space-y-6">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {group.types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          onPickBlock(type);
                          onClose();
                        }}
                        className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-left transition"
                      >
                        <span className="text-lg">{BLOCK_ICONS[type]}</span>
                        <span className="text-xs font-medium text-gray-700">{BLOCK_LABELS[type]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filteredGroups.every((g) => g.types.length === 0) && (
                <p className="text-center text-sm text-gray-400 py-8">Aucun bloc trouvé.</p>
              )}
            </div>
          )}

          {tab === "patterns" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPatterns.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onPickPattern(p.id);
                    onClose();
                  }}
                  className="flex gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-left transition"
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{p.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
                  </div>
                </button>
              ))}
              {filteredPatterns.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8 col-span-full">Aucun pattern.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
