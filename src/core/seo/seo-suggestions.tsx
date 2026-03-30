"use client";

import { buildSeoSuggestions, type SeoSuggestionItem } from "@/core/seo/analyze";

export function SeoSuggestionsList({
  items,
}: {
  items: SeoSuggestionItem[];
}) {
  if (!items.length) {
    return (
      <p className="text-xs text-gray-400">
        Aucune suggestion pour l’instant. Renseignez titre, description ou mot-clé pour obtenir des repères.
      </p>
    );
  }
  return (
    <ul className="space-y-2 text-xs">
      {items.map((s, i) => (
        <li
          key={i}
          className={
            s.level === "warning"
              ? "rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900"
              : "rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-gray-700"
          }
        >
          {s.text}
        </li>
      ))}
    </ul>
  );
}

export function SeoSuggestionsPanel(props: {
  targetKeyword: string;
  metaTitle: string;
  metaDescription: string;
  document?: unknown;
  supplementalText?: string;
}) {
  const items = buildSeoSuggestions({
    targetKeyword: props.targetKeyword,
    metaTitle: props.metaTitle,
    metaDescription: props.metaDescription,
    document: props.document,
    supplementalText: props.supplementalText,
  });
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Suggestions (bonnes pratiques, pas de garantie de classement)
      </p>
      <div className="mt-2">
        <SeoSuggestionsList items={items} />
      </div>
    </div>
  );
}
