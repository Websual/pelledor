"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PageDocumentV1 } from "@/core/builder/page-document";
import {
  addRow,
  removeRow,
  duplicateRow,
  reorderRows,
  setRowColumnSpans,
  findBlockLocation,
  addBlockToColumn,
  appendBlocksToColumn,
  removeBlock,
  reorderBlocksInColumn,
} from "@/core/builder/document-mutations";
import { COLUMN_PRESETS } from "@/core/builder/layout-presets";
import type { PageBlock } from "@/core/builder/block-types";
import { BLOCK_DEFAULTS, BLOCK_ICONS, BLOCK_LABELS, type BlockType } from "@/core/builder/block-types";
import { getPatternBlocks } from "@/core/builder/patterns";
import type { BuilderSelection, FocusColumn } from "./builder-types";
import { BuilderLibraryModal } from "./builder-library-modal";

const P_ROW = "sr:";
const P_BLK = "sb:";

function prefixRow(id: string) {
  return `${P_ROW}${id}`;
}
function prefixBlock(id: string) {
  return `${P_BLK}${id}`;
}

function SortableBlockRow({
  block,
  selected,
  onSelect,
  onDelete,
}: {
  block: PageBlock;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prefixBlock(block.id),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border text-sm cursor-pointer ${
        selected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200"
      }`}
      onClick={onSelect}
    >
      <button
        type="button"
        className="text-gray-300 hover:text-gray-500 cursor-grab touch-none"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </button>
      <span>{BLOCK_ICONS[block.type]}</span>
      <span className="flex-1 truncate text-gray-700">{BLOCK_LABELS[block.type]}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-gray-300 hover:text-red-400"
      >
        ×
      </button>
    </div>
  );
}

function SortableRowChrome({
  row,
  rowIndex,
  children,
  onSelectRow,
  onDuplicate,
  onDelete,
  onLayoutPreset,
  onCustomLayout,
  isRowSelected,
}: {
  row: PageDocumentV1["rows"][number];
  rowIndex: number;
  children: React.ReactNode;
  onSelectRow: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLayoutPreset: (spans: number[]) => void;
  onCustomLayout: () => void;
  isRowSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prefixRow(row.id),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const spanLabel = row.columns.map((c) => c.span).join(" + ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border-2 bg-gray-50/80 ${
        isRowSelected ? "border-blue-400" : "border-gray-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-gray-200 bg-white rounded-t-xl">
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 cursor-grab touch-none px-1"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={onSelectRow}
          className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
        >
          Section {rowIndex + 1}
        </button>
        <span className="text-[10px] text-gray-400">({spanLabel} / 12)</span>
        <div className="flex-1" />
        <select
          aria-label="Grille colonnes"
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 max-w-[140px]"
          value=""
          onChange={(e) => {
            const v = e.target.value;
            e.target.value = "";
            if (v === "__custom__") {
              onCustomLayout();
              return;
            }
            const preset = COLUMN_PRESETS.find((p) => p.id === v);
            if (preset) onLayoutPreset(preset.spans);
          }}
        >
          <option value="">Grille…</option>
          {COLUMN_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="__custom__">Personnalisé…</option>
        </select>
        <button
          type="button"
          title="Dupliquer la section"
          onClick={onDuplicate}
          className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
        >
          ⧉
        </button>
        <button
          type="button"
          title="Supprimer la section"
          onClick={onDelete}
          className="text-xs px-2 py-1 text-red-400 hover:bg-red-50 rounded"
        >
          ×
        </button>
      </div>
      <div className="p-2 space-y-2">{children}</div>
    </div>
  );
}

type Props = {
  doc: PageDocumentV1;
  setDoc: React.Dispatch<React.SetStateAction<PageDocumentV1>>;
  selection: BuilderSelection;
  setSelection: (s: BuilderSelection) => void;
  focusColumn: FocusColumn | null;
  setFocusColumn: (f: FocusColumn | null) => void;
};

export function BuilderOutline({
  doc,
  setDoc,
  selection,
  setSelection,
  focusColumn,
  setFocusColumn,
}: Props) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<FocusColumn | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function resolveTargetColumn(explicit?: FocusColumn | null): FocusColumn | null {
    if (explicit && explicit.rowId && explicit.colId) return explicit;
    if (focusColumn) return focusColumn;
    const last = doc.rows[doc.rows.length - 1];
    const col = last?.columns[0];
    if (last && col) return { rowId: last.id, colId: col.id };
    return null;
  }

  function openLibraryFor(target: FocusColumn) {
    setLibraryTarget(target);
    setFocusColumn(target);
    setLibraryOpen(true);
  }

  function applyLayout(rowId: string, spans: number[]) {
    try {
      setDoc((d) => setRowColumnSpans(d, rowId, spans));
    } catch {
      alert("Grille invalide : la somme des colonnes ne doit pas dépasser 12.");
    }
  }

  function promptCustomLayout(rowId: string) {
    const raw = window.prompt("Largeurs des colonnes sur 12 (ex: 6,6 ou 4,4,4) :", "6,6");
    if (!raw) return;
    const spans = raw
      .split(/[,+\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    applyLayout(rowId, spans);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const a = String(active.id);
    const o = String(over.id);
    if (a === o) return;

    if (a.startsWith(P_ROW)) {
      if (!o.startsWith(P_ROW)) return;
      const order = doc.rows.map((r) => prefixRow(r.id));
      const oldIndex = order.indexOf(a);
      const newIndex = order.indexOf(o);
      if (oldIndex >= 0 && newIndex >= 0) {
        setDoc((d) => reorderRows(d, oldIndex, newIndex));
      }
      return;
    }

    if (a.startsWith(P_BLK) && o.startsWith(P_BLK)) {
      const idA = a.slice(P_BLK.length);
      const idB = o.slice(P_BLK.length);
      const locA = findBlockLocation(doc, idA);
      const locB = findBlockLocation(doc, idB);
      if (!locA || !locB) return;
      if (locA.rowId !== locB.rowId || locA.colId !== locB.colId) return;
      const col = doc.rows.find((r) => r.id === locA.rowId)?.columns.find((c) => c.id === locA.colId);
      if (!col) return;
      const order = col.blocks.map((b) => prefixBlock(b.id));
      const oi = order.indexOf(a);
      const ni = order.indexOf(o);
      if (oi >= 0 && ni >= 0) {
        setDoc((d) => reorderBlocksInColumn(d, locA.rowId, locA.colId, oi, ni));
      }
    }
  }

  function addBlockOfType(type: BlockType, target: FocusColumn | null) {
    const t = resolveTargetColumn(target);
    if (!t) return;
    const newBlock: PageBlock = {
      id: crypto.randomUUID(),
      type,
      config: { ...(BLOCK_DEFAULTS[type] as object) } as PageBlock["config"],
    };
    setDoc((d) => addBlockToColumn(d, t.rowId, t.colId, newBlock));
    setSelection({ kind: "block", rowId: t.rowId, colId: t.colId, blockId: newBlock.id });
  }

  function addPattern(patternId: string, target: FocusColumn | null) {
    const t = resolveTargetColumn(target);
    if (!t) return;
    const blocks = getPatternBlocks(patternId);
    if (!blocks.length) return;
    setDoc((d) => appendBlocksToColumn(d, t.rowId, t.colId, blocks));
    const last = blocks[blocks.length - 1];
    setSelection({ kind: "block", rowId: t.rowId, colId: t.colId, blockId: last.id });
  }

  const rowIds = doc.rows.map((r) => prefixRow(r.id));

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              const next = addRow(doc);
              const added = next.rows[next.rows.length - 1];
              const col = added.columns[0];
              setDoc(next);
              setFocusColumn({ rowId: added.id, colId: col.id });
              setSelection({ kind: "column", rowId: added.id, colId: col.id });
            }}
            className="w-full py-2 text-sm border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
          >
            + Nouvelle section
          </button>

          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            {doc.rows.map((row, rowIndex) => (
              <SortableRowChrome
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                isRowSelected={selection.kind === "row" && selection.rowId === row.id}
                onSelectRow={() => {
                  setSelection({ kind: "row", rowId: row.id });
                  const c = row.columns[0];
                  if (c) setFocusColumn({ rowId: row.id, colId: c.id });
                }}
                onDuplicate={() => setDoc((d) => duplicateRow(d, row.id))}
                onDelete={() => {
                  setDoc((d) => removeRow(d, row.id));
                  setSelection({ kind: "none" });
                }}
                onLayoutPreset={(spans) => applyLayout(row.id, spans)}
                onCustomLayout={() => promptCustomLayout(row.id)}
              >
                {row.columns.map((col) => {
                  const colSelected =
                    selection.kind === "column" &&
                    selection.rowId === row.id &&
                    selection.colId === col.id;
                  const blockSelected = (bid: string) =>
                    selection.kind === "block" &&
                    selection.rowId === row.id &&
                    selection.colId === col.id &&
                    selection.blockId === bid;

                  return (
                    <div
                      key={col.id}
                      className={`rounded-lg border p-2 ${
                        colSelected ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200 bg-white"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelection({ kind: "column", rowId: row.id, colId: col.id });
                        setFocusColumn({ rowId: row.id, colId: col.id });
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-gray-500 uppercase">
                          Colonne · {col.span}/12
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLibraryFor({ rowId: row.id, colId: col.id });
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          + Bloc / pattern
                        </button>
                      </div>
                      <SortableContext
                        items={col.blocks.map((b) => prefixBlock(b.id))}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1.5">
                          {col.blocks.map((block) => (
                            <SortableBlockRow
                              key={block.id}
                              block={block}
                              selected={blockSelected(block.id)}
                              onSelect={() => {
                                setSelection({
                                  kind: "block",
                                  rowId: row.id,
                                  colId: col.id,
                                  blockId: block.id,
                                });
                                setFocusColumn({ rowId: row.id, colId: col.id });
                              }}
                              onDelete={() => {
                                setDoc((d) => removeBlock(d, block.id));
                                setSelection({ kind: "none" });
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      {col.blocks.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-3">Colonne vide</p>
                      )}
                    </div>
                  );
                })}
              </SortableRowChrome>
            ))}
          </SortableContext>

          {doc.rows.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">Aucune section</p>
          )}
        </div>
      </DndContext>

      <div className="p-3 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={() => openLibraryFor(resolveTargetColumn(focusColumn)!)}
          disabled={!resolveTargetColumn(focusColumn)}
          className="w-full py-2 text-sm border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 transition disabled:opacity-40"
        >
          + Ajouter bloc ou section (pattern)
        </button>
      </div>

      <BuilderLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPickBlock={(type) => addBlockOfType(type, libraryTarget ?? focusColumn)}
        onPickPattern={(patternId) => addPattern(patternId, libraryTarget ?? focusColumn)}
      />
    </>
  );
}
