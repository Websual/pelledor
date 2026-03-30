"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PageBlock, BlockType } from "@/core/builder/block-types";
import { BLOCK_DEFAULTS, BLOCK_ICONS, BLOCK_LABELS } from "@/core/builder/block-types";
import { BlockConfigEditor } from "./BlockConfigEditor";

// ─── Sortable block item ──────────────────────────────────────────────────────

function SortableBlock({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <button
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </button>

      <span className="text-xl flex-shrink-0">{BLOCK_ICONS[block.type]}</span>
      <span className="flex-1 text-sm font-medium text-gray-700 truncate">
        {BLOCK_LABELS[block.type]}
        {"title" in block.config && (block.config as { title?: string }).title && (
          <span className="text-gray-400 font-normal ml-1">— {(block.config as { title?: string }).title}</span>
        )}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-gray-300 hover:text-red-400 flex-shrink-0 text-lg leading-none"
        title="Supprimer"
      >
        ×
      </button>
    </div>
  );
}

// ─── Add block panel ──────────────────────────────────────────────────────────

const BLOCK_GROUPS: { label: string; types: BlockType[] }[] = [
  { label: "Contenu", types: ["hero", "text", "image", "gallery", "separator"] },
  { label: "Conversion", types: ["cta", "services", "contact-info", "embed"] },
  { label: "Modules", types: ["booking-widget", "click-collect-widget", "quote-form", "restaurant-menu"] },
];

function AddBlockPanel({ onAdd }: { onAdd: (type: BlockType) => void }) {
  return (
    <div className="space-y-4">
      {BLOCK_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {group.types.map((type) => (
              <button
                key={type}
                onClick={() => onAdd(type)}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-left transition"
              >
                <span className="text-base">{BLOCK_ICONS[type]}</span>
                <span className="text-xs font-medium text-gray-700 leading-tight">{BLOCK_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageSlug, setPageSlug] = useState("home");
  const [panel, setPanel] = useState<"add" | "edit">("add");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load
  useEffect(() => {
    fetch(`/api/modules/page-builder/pages`)
      .then((r) => r.json())
      .then((d) => {
        const page = (d.pages ?? []).find((p: { pageSlug: string }) => p.pageSlug === pageSlug);
        if (page) {
          setBlocks(page.blocks ?? []);
          setPublished(!!page.publishedAt);
        }
      });
  }, [pageSlug]);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  function addBlock(type: BlockType) {
    const newBlock: PageBlock = {
      id: crypto.randomUUID(),
      type,
      config: { ...(BLOCK_DEFAULTS[type] as object) } as PageBlock["config"],
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
    setPanel("edit");
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) { setSelectedId(null); setPanel("add"); }
  }

  function updateBlock(id: string, config: PageBlock["config"]) {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, config } : b));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const save = useCallback(async (publish = false) => {
    setSaving(true);
    try {
      await fetch("/api/modules/page-builder/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSlug, blocks, publish }),
      });
      setSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      if (publish) setPublished(true);
    } finally {
      setSaving(false);
    }
  }, [pageSlug, blocks]);

  // Auto-save toutes les 30s
  useEffect(() => {
    const t = setInterval(() => save(false), 30000);
    return () => clearInterval(t);
  }, [save]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Panneau gauche : blocs ── */}
      <div className="w-72 flex flex-col bg-white border-r border-gray-200 overflow-hidden">

        {/* Header + page select */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="font-semibold text-gray-800 flex-1">🧱 Page Builder</h1>
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
          {/* Save / Publish */}
          <div className="flex gap-2">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex-1 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition"
            >
              {saving ? "…" : "💾 Sauvegarder"}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="flex-1 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              🚀 Publier
            </button>
          </div>
          {savedAt && <p className="text-xs text-gray-400 mt-1 text-center">Sauvegardé à {savedAt} {published && "· Publié ✓"}</p>}
        </div>

        {/* Liste des blocs */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  selected={selectedId === block.id}
                  onSelect={() => { setSelectedId(block.id); setPanel("edit"); }}
                  onDelete={() => deleteBlock(block.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {blocks.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p className="text-3xl mb-2">📄</p>
              <p>Page vide</p>
              <p className="text-xs mt-1">Ajoutez des blocs depuis le panneau ci-dessous</p>
            </div>
          )}
        </div>

        {/* Bouton + Ajouter */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => { setSelectedId(null); setPanel("add"); }}
            className="w-full py-2 text-sm border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 transition"
          >
            + Ajouter un bloc
          </button>
        </div>
      </div>

      {/* ── Panneau droit : config / add ── */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-700 text-sm">
            {panel === "add" ? "Choisir un bloc" : `Configurer — ${selectedBlock ? BLOCK_LABELS[selectedBlock.type] : ""}`}
          </h2>
        </div>
        <div className="p-4">
          {panel === "add" && <AddBlockPanel onAdd={addBlock} />}
          {panel === "edit" && selectedBlock && (
            <BlockConfigEditor
              block={selectedBlock}
              onChange={(config) => updateBlock(selectedBlock.id, config)}
            />
          )}
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="flex-1 overflow-y-auto bg-gray-100">
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">Prévisualisation — <span className="font-medium">/{pageSlug}</span></p>
          <div className="flex gap-2 text-xs text-gray-400">
            <span>{blocks.length} bloc{blocks.length !== 1 ? "s" : ""}</span>
            {published && <span className="text-green-600 font-medium">● Publié</span>}
          </div>
        </div>
        <div className="bg-white min-h-full shadow-sm mx-auto max-w-4xl my-4 rounded-xl overflow-hidden">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-300">
              <p className="text-6xl mb-4">🖼️</p>
              <p className="text-lg">La page est vide</p>
              <p className="text-sm mt-1">Ajoutez des blocs depuis le panneau gauche</p>
            </div>
          ) : (
            <PreviewBlocks blocks={blocks} />
          )}
        </div>
      </div>
    </div>
  );
}

// Lazy import pour éviter les dépendances serveur dans le client
function PreviewBlocks({ blocks }: { blocks: PageBlock[] }) {
  const [Renderer, setRenderer] = useState<React.ComponentType<{ blocks: PageBlock[] }> | null>(null);
  useEffect(() => {
    import("@/core/builder/BlockRenderer").then((m) => setRenderer(() => m.BlockRenderer));
  }, []);
  if (!Renderer) return <div className="p-8 text-center text-gray-400 animate-pulse">Chargement…</div>;
  return <Renderer blocks={blocks} />;
}
