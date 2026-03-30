"use client";

import { useCallback, useEffect, useState } from "react";
import { parsePageBlocksFromDb, type PageDocumentV1 } from "@/core/builder/page-document";
import { flattenDocumentToBlocks } from "@/core/builder/page-document";
import { PageDocumentRenderer } from "@/core/builder/BlockRenderer";
import { BuilderOutline } from "./builder-outline";
import { BuilderInspector } from "./builder-inspector";
import {
  BuilderSeoPanel,
  emptyBuilderSeo,
  type BuilderPageSeoState,
} from "./builder-seo-panel";
import type { BuilderSelection, FocusColumn } from "./builder-types";

type PreviewMode = "desktop" | "tablet" | "mobile";

const PREVIEW_WIDTH: Record<PreviewMode, string> = {
  desktop: "100%",
  tablet: "min(834px, 100%)",
  mobile: "min(390px, 100%)",
};

export default function BuilderPage() {
  const [doc, setDoc] = useState<PageDocumentV1>(() => parsePageBlocksFromDb(null));
  const [selection, setSelection] = useState<BuilderSelection>({ kind: "none" });
  const [focusColumn, setFocusColumn] = useState<FocusColumn | null>(null);
  const [pageSlug, setPageSlug] = useState("home");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [seo, setSeo] = useState<BuilderPageSeoState>(() => emptyBuilderSeo());

  const blocksFlat = flattenDocumentToBlocks(doc);

  useEffect(() => {
    setSelection({ kind: "none" });
    setFocusColumn(null);
    fetch(`/api/modules/page-builder/pages`)
      .then((r) => r.json())
      .then((d) => {
        const page = (d.pages ?? []).find((p: { pageSlug: string }) => p.pageSlug === pageSlug);
        if (page) {
          const parsed = parsePageBlocksFromDb(page.blocks);
          setDoc(parsed);
          setPublished(!!page.publishedAt);
          setSeo({
            metaTitle: page.metaTitle ?? "",
            metaDescription: page.metaDescription ?? "",
            canonicalUrl: page.canonicalUrl ?? "",
            ogTitle: page.ogTitle ?? "",
            ogDescription: page.ogDescription ?? "",
            ogImageUrl: page.ogImageUrl ?? "",
            noindex: !!page.noindex,
            targetKeyword: page.targetKeyword ?? "",
          });
          const last = parsed.rows[parsed.rows.length - 1];
          const c0 = last?.columns[0];
          setFocusColumn(c0 ? { rowId: last.id, colId: c0.id } : null);
        } else {
          const empty = parsePageBlocksFromDb(null);
          setDoc(empty);
          setPublished(false);
          setSeo(emptyBuilderSeo());
          const last = empty.rows[0];
          const c0 = last?.columns[0];
          setFocusColumn(c0 ? { rowId: last.id, colId: c0.id } : null);
        }
      });
  }, [pageSlug]);

  const save = useCallback(
    async (shouldPublish = false) => {
      setSaving(true);
      try {
        await fetch("/api/modules/page-builder/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageSlug,
            blocks: doc,
            publish: shouldPublish,
            metaTitle: seo.metaTitle,
            metaDescription: seo.metaDescription,
            canonicalUrl: seo.canonicalUrl,
            ogTitle: seo.ogTitle,
            ogDescription: seo.ogDescription,
            ogImageUrl: seo.ogImageUrl,
            noindex: seo.noindex,
            targetKeyword: seo.targetKeyword,
          }),
        });
        setSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
        if (shouldPublish) setPublished(true);
      } finally {
        setSaving(false);
      }
    },
    [pageSlug, doc, seo]
  );

  useEffect(() => {
    const t = setInterval(() => save(false), 30000);
    return () => clearInterval(t);
  }, [save]);

  const inspectorTitle =
    selection.kind === "block"
      ? "Bloc"
      : selection.kind === "row"
        ? "Section"
        : selection.kind === "column"
          ? "Colonne"
          : "Inspecteur";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="w-80 flex flex-col bg-white border-r border-gray-200 overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="font-semibold text-gray-800 flex-1 text-sm">🧱 Page Builder</h1>
            <select
              value={pageSlug}
              onChange={(e) => setPageSlug(e.target.value)}
              className="text-xs border rounded px-2 py-1 text-gray-600"
            >
              <option value="home">Accueil</option>
              <option value="about">À propos</option>
              <option value="services">Services</option>
              <option value="contact">Contact</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving}
              className="flex-1 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition"
            >
              {saving ? "…" : "💾 Sauvegarder"}
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className="flex-1 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              🚀 Publier
            </button>
          </div>
          {savedAt && (
            <p className="text-xs text-gray-400 mt-1 text-center">
              Sauvegardé à {savedAt} {published && "· Publié ✓"}
            </p>
          )}
        </div>

        <BuilderOutline
          doc={doc}
          setDoc={setDoc}
          selection={selection}
          setSelection={setSelection}
          focusColumn={focusColumn}
          setFocusColumn={setFocusColumn}
        />
      </div>

      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
        <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-medium text-gray-700 text-sm">Réglages — {inspectorTitle}</h2>
        </div>
        <div className="p-4 space-y-2">
          <BuilderInspector doc={doc} setDoc={setDoc} selection={selection} />
          <BuilderSeoPanel seo={seo} onChange={setSeo} doc={doc} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-100 min-w-0">
        <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Prévisualisation — <span className="font-medium">/{pageSlug}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 mr-2">
              {blocksFlat.length} bloc{blocksFlat.length !== 1 ? "s" : ""} · {doc.rows.length} section
              {doc.rows.length !== 1 ? "s" : ""}
            </span>
            {published && <span className="text-xs text-green-600 font-medium">● Publié</span>}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(
                [
                  ["desktop", "PC"],
                  ["tablet", "Tablette"],
                  ["mobile", "Mobile"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`px-3 py-1.5 ${
                    previewMode === mode ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div
          className="bg-white min-h-[calc(100vh-5rem)] shadow-sm my-4 rounded-xl overflow-hidden mx-auto transition-[max-width] duration-200"
          style={{ maxWidth: PREVIEW_WIDTH[previewMode] }}
        >
          {blocksFlat.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-300">
              <p className="text-6xl mb-4">🖼️</p>
              <p className="text-lg">Page vide</p>
              <p className="text-sm mt-1 px-6 text-center text-gray-400">
                Ajoutez une section, puis des blocs ou un pattern depuis le panneau de gauche.
              </p>
            </div>
          ) : (
            <PageDocumentRenderer payload={doc} />
          )}
        </div>
      </div>
    </div>
  );
}
