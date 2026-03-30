"use client";

import { SeoSuggestionsPanel } from "@/core/seo/seo-suggestions";
import type { PageDocumentV1 } from "@/core/builder/page-document";

export type BuilderPageSeoState = {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  noindex: boolean;
  targetKeyword: string;
};

export const emptyBuilderSeo = (): BuilderPageSeoState => ({
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
  noindex: false,
  targetKeyword: "",
});

export function BuilderSeoPanel({
  seo,
  onChange,
  doc,
}: {
  seo: BuilderPageSeoState;
  onChange: (next: BuilderPageSeoState) => void;
  doc: PageDocumentV1;
}) {
  return (
    <div className="space-y-3 border-t border-gray-100 pt-4 mt-2">
      <h3 className="text-xs font-semibold text-gray-700">Référencement (page)</h3>
      <div>
        <label className="block text-[10px] font-semibold uppercase text-gray-400">Titre meta</label>
        <input
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
          value={seo.metaTitle}
          onChange={(e) => onChange({ ...seo, metaTitle: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase text-gray-400">
          Meta description
        </label>
        <textarea
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
          rows={3}
          value={seo.metaDescription}
          onChange={(e) => onChange({ ...seo, metaDescription: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase text-gray-400">
          URL canonique (absolue, optionnel)
        </label>
        <input
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
          value={seo.canonicalUrl}
          onChange={(e) => onChange({ ...seo, canonicalUrl: e.target.value })}
          placeholder="https://"
        />
      </div>
      <p className="text-[10px] text-gray-500 font-medium">Open Graph</p>
      <div>
        <label className="block text-[10px] font-semibold uppercase text-gray-400">og:title</label>
        <input
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
          value={seo.ogTitle}
          onChange={(e) => onChange({ ...seo, ogTitle: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase text-gray-400">og:description</label>
        <textarea
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
          rows={2}
          value={seo.ogDescription}
          onChange={(e) => onChange({ ...seo, ogDescription: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase text-gray-400">og:image (URL)</label>
        <input
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
          value={seo.ogImageUrl}
          onChange={(e) => onChange({ ...seo, ogImageUrl: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase text-gray-400">
          Mot-clé cible
        </label>
        <input
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
          value={seo.targetKeyword}
          onChange={(e) => onChange({ ...seo, targetKeyword: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={seo.noindex}
          onChange={(e) => onChange({ ...seo, noindex: e.target.checked })}
        />
        Demander noindex (ne pas indexer cette page)
      </label>
      <SeoSuggestionsPanel
        targetKeyword={seo.targetKeyword}
        metaTitle={seo.metaTitle}
        metaDescription={seo.metaDescription}
        document={doc}
      />
    </div>
  );
}
