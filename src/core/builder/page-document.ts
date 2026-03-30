/**
 * Contrat canonique des pages builder (Phase A).
 *
 * - Ancien format : `PageBlock[]` (liste plate) — encore accepté en entrée, normalisé en document v1 à l’enregistrement.
 * - Format cible : `PageDocumentV1` — lignes → colonnes (grille 12) → blocs, aligné sur la logique type WPBakery.
 *
 * Voir `docs/ROADMAP_CMS_BUILDER_AGENT.md` et `docs/schemas/page-blocks-payload.schema.json`.
 */

import type { BlockType, PageBlock } from "./block-types";
import { BLOCK_DEFAULTS } from "./block-types";

export const PAGE_DOCUMENT_VERSION = 1 as const;

/** IDs stables pour le chemin « liste plate → document » (évite clés React qui changent à chaque sync). */
export const FLAT_ROW_ID = "__row_flat__";
export const FLAT_COL_ID = "__col_flat__";

function newEntityId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const KNOWN_TYPES = new Set(Object.keys(BLOCK_DEFAULTS) as BlockType[]);

export type RowSettingsV1 = {
  /** Ex. largeur conteneur, padding — Phase B: champs typés comme les captures WPBakery */
  [key: string]: unknown;
};

export type ColumnSettingsV1 = {
  [key: string]: unknown;
};

export interface BuilderColumnV1 {
  id: string;
  /** Portion sur 12 (grille type WPBakery). Somme des colonnes d’une ligne ≤ 12. */
  span: number;
  columnSettings?: ColumnSettingsV1;
  blocks: PageBlock[];
}

export interface BuilderRowV1 {
  id: string;
  rowSettings?: RowSettingsV1;
  columns: BuilderColumnV1[];
}

export interface PageDocumentV1 {
  version: typeof PAGE_DOCUMENT_VERSION;
  rows: BuilderRowV1[];
}

function isPageBlock(x: unknown): x is PageBlock {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return false;
  if (typeof o.type !== "string" || !KNOWN_TYPES.has(o.type as BlockType)) return false;
  if (!o.config || typeof o.config !== "object" || Array.isArray(o.config)) return false;
  return true;
}

function validatePageBlocksArray(arr: unknown): arr is PageBlock[] {
  return Array.isArray(arr) && arr.every(isPageBlock);
}

export function isPageDocumentV1(doc: unknown): doc is PageDocumentV1 {
  if (!doc || typeof doc !== "object") return false;
  const o = doc as Record<string, unknown>;
  if (o.version !== PAGE_DOCUMENT_VERSION) return false;
  if (!Array.isArray(o.rows)) return false;

  for (const row of o.rows) {
    if (!row || typeof row !== "object") return false;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || !Array.isArray(r.columns)) return false;
    let sum = 0;
    for (const col of r.columns) {
      if (!col || typeof col !== "object") return false;
      const c = col as Record<string, unknown>;
      if (typeof c.id !== "string") return false;
      if (typeof c.span !== "number" || !Number.isInteger(c.span)) return false;
      if (c.span < 1 || c.span > 12) return false;
      sum += c.span;
      if (!Array.isArray(c.blocks) || !c.blocks.every(isPageBlock)) return false;
    }
    if (sum > 12) return false;
  }
  return true;
}

/** Erreur métier de validation (message utilisateur / log). */
export class PageDocumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageDocumentValidationError";
  }
}

/**
 * Normalise une entrée (tableau plat ou document v1 déjà valide) vers `PageDocumentV1`.
 */
export function normalizeBlocksToDocument(input: unknown): PageDocumentV1 {
  if (isPageDocumentV1(input)) return input;
  if (validatePageBlocksArray(input)) {
    if (input.length === 0) {
      return {
        version: PAGE_DOCUMENT_VERSION,
        rows: [
          {
            id: FLAT_ROW_ID,
            columns: [{ id: FLAT_COL_ID, span: 12, blocks: [] }],
          },
        ],
      };
    }
    return {
      version: PAGE_DOCUMENT_VERSION,
      rows: [
        {
          id: FLAT_ROW_ID,
          columns: [{ id: FLAT_COL_ID, span: 12, blocks: input }],
        },
      ],
    };
  }
  throw new PageDocumentValidationError(
    "Format de page invalide : attendu un tableau de blocs ou un document { version: 1, rows }."
  );
}

/** Lecture DB tolérante : null / invalide → document vide une ligne. */
export function parsePageBlocksFromDb(raw: unknown): PageDocumentV1 {
  if (raw == null) {
    return {
      version: PAGE_DOCUMENT_VERSION,
      rows: [
        {
          id: newEntityId(),
          columns: [{ id: newEntityId(), span: 12, blocks: [] }],
        },
      ],
    };
  }
  try {
    return normalizeBlocksToDocument(raw);
  } catch {
    return {
      version: PAGE_DOCUMENT_VERSION,
      rows: [
        {
          id: newEntityId(),
          columns: [{ id: newEntityId(), span: 12, blocks: [] }],
        },
      ],
    };
  }
}

/**
 * Applique une liste plate de blocs au document en préservant ligne/colonne
 * tant qu’il n’y a qu’une seule colonne ; sinon repli sur une grille 1×12.
 */
export function applyFlatBlockListToDocument(
  doc: PageDocumentV1,
  newBlocks: PageBlock[]
): PageDocumentV1 {
  if (doc.rows.length === 1 && doc.rows[0].columns.length === 1) {
    const row = doc.rows[0];
    const col = row.columns[0];
    return {
      version: PAGE_DOCUMENT_VERSION,
      rows: [
        {
          id: row.id,
          rowSettings: row.rowSettings,
          columns: [
            {
              id: col.id,
              span: col.span,
              columnSettings: col.columnSettings,
              blocks: newBlocks,
            },
          ],
        },
      ],
    };
  }
  return normalizeBlocksToDocument(newBlocks);
}

/** Ordre parcours : lignes → colonnes → blocs (préserve lecture “en grille”). */
export function flattenDocumentToBlocks(doc: PageDocumentV1): PageBlock[] {
  const out: PageBlock[] = [];
  for (const row of doc.rows) {
    for (const col of row.columns) {
      out.push(...col.blocks);
    }
  }
  return out;
}

/** Sérialisation stable pour export (ex. agent). */
export function serializePageDocument(doc: PageDocumentV1): unknown {
  return JSON.parse(JSON.stringify(doc)) as unknown;
}
