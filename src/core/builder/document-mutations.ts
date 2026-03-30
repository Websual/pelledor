import type { PageBlock } from "./block-types";
import type { BuilderColumnV1, BuilderRowV1, PageDocumentV1 } from "./page-document";
import { PAGE_DOCUMENT_VERSION } from "./page-document";
import { validateSpans } from "./layout-presets";

function newId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function cloneBlock(b: PageBlock): PageBlock {
  return {
    ...b,
    id: newId(),
    config: JSON.parse(JSON.stringify(b.config)) as PageBlock["config"],
  };
}

export function addRow(doc: PageDocumentV1): PageDocumentV1 {
  return {
    version: PAGE_DOCUMENT_VERSION,
    rows: [
      ...doc.rows,
      {
        id: newId(),
        columns: [{ id: newId(), span: 12, blocks: [] }],
      },
    ],
  };
}

export function removeRow(doc: PageDocumentV1, rowId: string): PageDocumentV1 {
  const rows = doc.rows.filter((r) => r.id !== rowId);
  if (rows.length === 0) {
    return {
      version: PAGE_DOCUMENT_VERSION,
      rows: [
        {
          id: newId(),
          columns: [{ id: newId(), span: 12, blocks: [] }],
        },
      ],
    };
  }
  return { version: PAGE_DOCUMENT_VERSION, rows };
}

export function duplicateRow(doc: PageDocumentV1, rowId: string): PageDocumentV1 {
  const idx = doc.rows.findIndex((r) => r.id === rowId);
  if (idx === -1) return doc;
  const row = doc.rows[idx];
  const clone: BuilderRowV1 = {
    id: newId(),
    rowSettings: row.rowSettings ? { ...row.rowSettings } : undefined,
    columns: row.columns.map((c) => ({
      id: newId(),
      span: c.span,
      columnSettings: c.columnSettings ? { ...c.columnSettings } : undefined,
      blocks: c.blocks.map(cloneBlock),
    })),
  };
  const rows = [...doc.rows.slice(0, idx + 1), clone, ...doc.rows.slice(idx + 1)];
  return { version: PAGE_DOCUMENT_VERSION, rows };
}

export function reorderRows(doc: PageDocumentV1, fromIndex: number, toIndex: number): PageDocumentV1 {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return doc;
  const rows = [...doc.rows];
  const [removed] = rows.splice(fromIndex, 1);
  rows.splice(toIndex, 0, removed);
  return { version: PAGE_DOCUMENT_VERSION, rows };
}

/**
 * Redéfinit les colonnes d’une ligne. Tous les blocs existants sont regroupés dans la première colonne.
 */
export function setRowColumnSpans(
  doc: PageDocumentV1,
  rowId: string,
  spans: number[]
): PageDocumentV1 {
  const err = validateSpans(spans);
  if (err) throw new Error(err);
  const rowIndex = doc.rows.findIndex((r) => r.id === rowId);
  if (rowIndex === -1) return doc;
  const row = doc.rows[rowIndex];
  const allBlocks = row.columns.flatMap((c) => c.blocks);
  const newColumns: BuilderColumnV1[] = spans.map((span, i) => ({
    id: newId(),
    span,
    columnSettings: i < row.columns.length ? row.columns[i]?.columnSettings : undefined,
    blocks: i === 0 ? allBlocks : [],
  }));
  const newRow: BuilderRowV1 = {
    ...row,
    columns: newColumns,
  };
  const rows = [...doc.rows];
  rows[rowIndex] = newRow;
  return { version: PAGE_DOCUMENT_VERSION, rows };
}

export function updateRowSettings(
  doc: PageDocumentV1,
  rowId: string,
  patch: Record<string, unknown>
): PageDocumentV1 {
  return {
    version: PAGE_DOCUMENT_VERSION,
    rows: doc.rows.map((r) =>
      r.id === rowId
        ? {
            ...r,
            rowSettings: { ...(r.rowSettings ?? {}), ...patch },
          }
        : r
    ),
  };
}

export function updateColumnSettings(
  doc: PageDocumentV1,
  rowId: string,
  colId: string,
  patch: Record<string, unknown>
): PageDocumentV1 {
  return {
    version: PAGE_DOCUMENT_VERSION,
    rows: doc.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        columns: r.columns.map((c) =>
          c.id === colId
            ? {
                ...c,
                columnSettings: { ...(c.columnSettings ?? {}), ...patch },
              }
            : c
        ),
      };
    }),
  };
}

export function getBlockById(doc: PageDocumentV1, blockId: string): PageBlock | null {
  for (const row of doc.rows) {
    for (const col of row.columns) {
      const b = col.blocks.find((x) => x.id === blockId);
      if (b) return b;
    }
  }
  return null;
}

export function findBlockLocation(
  doc: PageDocumentV1,
  blockId: string
): { rowId: string; colId: string; blockIndex: number } | null {
  for (const row of doc.rows) {
    for (const col of row.columns) {
      const blockIndex = col.blocks.findIndex((b) => b.id === blockId);
      if (blockIndex !== -1) return { rowId: row.id, colId: col.id, blockIndex };
    }
  }
  return null;
}

export function addBlockToColumn(
  doc: PageDocumentV1,
  rowId: string,
  colId: string,
  block: PageBlock
): PageDocumentV1 {
  return {
    version: PAGE_DOCUMENT_VERSION,
    rows: doc.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        columns: r.columns.map((c) =>
          c.id === colId ? { ...c, blocks: [...c.blocks, block] } : c
        ),
      };
    }),
  };
}

/** Ajoute plusieurs blocs à la fin d’une colonne (patterns). */
export function appendBlocksToColumn(
  doc: PageDocumentV1,
  rowId: string,
  colId: string,
  blocks: PageBlock[]
): PageDocumentV1 {
  return {
    version: PAGE_DOCUMENT_VERSION,
    rows: doc.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        columns: r.columns.map((c) =>
          c.id === colId ? { ...c, blocks: [...c.blocks, ...blocks] } : c
        ),
      };
    }),
  };
}

export function removeBlock(doc: PageDocumentV1, blockId: string): PageDocumentV1 {
  return {
    version: PAGE_DOCUMENT_VERSION,
    rows: doc.rows.map((r) => ({
      ...r,
      columns: r.columns.map((c) => ({
        ...c,
        blocks: c.blocks.filter((b) => b.id !== blockId),
      })),
    })),
  };
}

export function updateBlockConfig(
  doc: PageDocumentV1,
  blockId: string,
  config: PageBlock["config"]
): PageDocumentV1 {
  return {
    version: PAGE_DOCUMENT_VERSION,
    rows: doc.rows.map((r) => ({
      ...r,
      columns: r.columns.map((c) => ({
        ...c,
        blocks: c.blocks.map((b) => (b.id === blockId ? { ...b, config } : b)),
      })),
    })),
  };
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= arr.length || to < 0) return [...arr];
  const result = [...arr];
  const [item] = result.splice(from, 1);
  const safeTo = Math.min(Math.max(0, to), result.length);
  result.splice(safeTo, 0, item);
  return result;
}

export function reorderBlocksInColumn(
  doc: PageDocumentV1,
  rowId: string,
  colId: string,
  fromIndex: number,
  toIndex: number
): PageDocumentV1 {
  if (fromIndex === toIndex) return doc;
  return {
    version: PAGE_DOCUMENT_VERSION,
    rows: doc.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        columns: r.columns.map((c) => {
          if (c.id !== colId) return c;
          return { ...c, blocks: arrayMove(c.blocks, fromIndex, toIndex) };
        }),
      };
    }),
  };
}

/** Déplace un bloc vers une autre colonne (append en fin). */
export function moveBlockToColumn(
  doc: PageDocumentV1,
  blockId: string,
  targetRowId: string,
  targetColId: string
): PageDocumentV1 {
  const loc = findBlockLocation(doc, blockId);
  if (!loc) return doc;
  if (loc.rowId === targetRowId && loc.colId === targetColId) return doc;
  let block: PageBlock | undefined;
  const without = {
    version: PAGE_DOCUMENT_VERSION,
    rows: doc.rows.map((r) => ({
      ...r,
      columns: r.columns.map((c) => {
        const blocks = c.blocks.filter((b) => {
          if (b.id === blockId) {
            block = b;
            return false;
          }
          return true;
        });
        return { ...c, blocks };
      }),
    })),
  };
  if (!block) return doc;
  return addBlockToColumn(without, targetRowId, targetColId, block);
}
