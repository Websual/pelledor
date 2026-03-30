import { flattenDocumentToBlocks, isPageDocumentV1 } from "@/core/builder/page-document";
import type { PageBlock } from "@/core/builder/block-types";

export type SeoSuggestionItem = {
  level: "info" | "warning";
  text: string;
};

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function countH1InBlocks(blocks: PageBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.type === "hero") n += 1;
    if (b.type === "heading") {
      const level = (b.config as { level?: string }).level;
      if (level === "h1") n += 1;
    }
  }
  return n;
}

export function countH1InDocument(doc: unknown): number {
  if (!doc || !isPageDocumentV1(doc)) return 0;
  return countH1InBlocks(flattenDocumentToBlocks(doc));
}

/** Recommandations factuelles — pas de score ni promesse de positionnement. */
export function buildSeoSuggestions(input: {
  targetKeyword?: string;
  metaTitle?: string;
  metaDescription?: string;
  document?: unknown;
  supplementalText?: string;
}): SeoSuggestionItem[] {
  const out: SeoSuggestionItem[] = [];
  const title = (input.metaTitle ?? "").trim();
  const desc = (input.metaDescription ?? "").trim();
  const kw = (input.targetKeyword ?? "").trim().toLowerCase();
  const h1 = countH1InDocument(input.document);

  if (h1 === 0) {
    out.push({
      level: "warning",
      text: "Aucun titre principal (H1) détecté dans le document. Ajoutez un bloc « Titre » en H1 ou un hero.",
    });
  } else if (h1 > 1) {
    out.push({
      level: "warning",
      text: "Plusieurs H1 dans la page : une seule est en général préférable pour la clarté.",
    });
  }

  if (title.length > 0 && title.length < 30) {
    out.push({
      level: "info",
      text: "Titre meta court (moins d’environ 30 caractères) : vous pouvez le préciser si c’est pertinent.",
    });
  }
  if (title.length > 60) {
    out.push({
      level: "warning",
      text: "Titre meta long (plus d’environ 60 caractères) : il peut être tronqué dans les résultats de recherche.",
    });
  }

  if (desc.length > 0 && desc.length < 50) {
    out.push({
      level: "info",
      text: "Meta description courte : viser environ 50 à 160 caractères pour un snippet utile.",
    });
  }
  if (desc.length > 320) {
    out.push({
      level: "warning",
      text: "Meta description très longue : le moteur peut la raccourcir.",
    });
  }

  if (kw) {
    const tl = title.toLowerCase();
    const dl = desc.toLowerCase();
    const blob = (input.supplementalText ?? "").toLowerCase();
    if (title && !tl.includes(kw)) {
      out.push({
        level: "info",
        text: "Le mot-clé cible n’apparaît pas dans le titre meta — à ajouter seulement si le libellé reste naturel.",
      });
    }
    if (desc && !dl.includes(kw)) {
      out.push({
        level: "info",
        text: "Le mot-clé cible n’apparaît pas dans la meta description.",
      });
    }
    if (blob && !blob.includes(kw)) {
      out.push({
        level: "info",
        text: "Le mot-clé cible n’apparaît pas dans un extrait du corps — optionnel selon votre rédaction.",
      });
    }
  }

  return out;
}
