"use client";

import type { PageDocumentV1 } from "@/core/builder/page-document";
import { getBlockById, updateBlockConfig, updateColumnSettings, updateRowSettings } from "@/core/builder/document-mutations";
import { BlockConfigEditor } from "./BlockConfigEditor";
import type { BuilderSelection } from "./builder-types";

const inp =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

type Props = {
  doc: PageDocumentV1;
  setDoc: React.Dispatch<React.SetStateAction<PageDocumentV1>>;
  selection: BuilderSelection;
};

export function BuilderInspector({ doc, setDoc, selection }: Props) {
  if (selection.kind === "block") {
    const block = getBlockById(doc, selection.blockId);
    if (!block) {
      return <p className="text-sm text-gray-400">Bloc introuvable.</p>;
    }
    return (
      <BlockConfigEditor
        block={block}
        onChange={(config) => {
          setDoc((d) => updateBlockConfig(d, selection.blockId, config));
        }}
      />
    );
  }

  if (selection.kind === "row") {
    const row = doc.rows.find((r) => r.id === selection.rowId);
    if (!row) return <p className="text-sm text-gray-400">Section introuvable.</p>;
    const rs = (row.rowSettings ?? {}) as Record<string, string | undefined>;
    const patch = (p: Record<string, unknown>) =>
      setDoc((d) => updateRowSettings(d, row.id, p));

    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Réglages de section</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Espacement vertical</label>
          <select
            className={sel}
            value={String(rs.paddingY ?? "none")}
            onChange={(e) => patch({ paddingY: e.target.value })}
          >
            <option value="none">Aucun</option>
            <option value="sm">Petit</option>
            <option value="md">Moyen</option>
            <option value="lg">Grand</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Largeur du contenu</label>
          <select
            className={sel}
            value={String(rs.maxWidth ?? "full")}
            onChange={(e) => patch({ maxWidth: e.target.value })}
          >
            <option value="full">Pleine largeur</option>
            <option value="boxed">Conteneur centré (max 6xl)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Couleur de fond (CSS)</label>
          <input
            className={inp}
            placeholder="ex: #f5f5f5 ou transparent"
            value={rs.background ?? ""}
            onChange={(e) => patch({ background: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Image de fond (URL)</label>
          <input
            className={inp}
            placeholder="https://…"
            value={rs.backgroundImage ?? ""}
            onChange={(e) => patch({ backgroundImage: e.target.value || undefined })}
          />
        </div>
      </div>
    );
  }

  if (selection.kind === "column") {
    const row = doc.rows.find((r) => r.id === selection.rowId);
    const col = row?.columns.find((c) => c.id === selection.colId);
    if (!row || !col) return <p className="text-sm text-gray-400">Colonne introuvable.</p>;
    const cs = (col.columnSettings ?? {}) as Record<string, string | undefined>;
    const patch = (p: Record<string, unknown>) =>
      setDoc((d) => updateColumnSettings(d, row.id, col.id, p));

    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Réglages de colonne</p>
        <p className="text-xs text-gray-500">Largeur grille : {col.span} / 12</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Alignement du texte</label>
          <select
            className={sel}
            value={String(cs.textAlign ?? "left")}
            onChange={(e) => patch({ textAlign: e.target.value })}
          >
            <option value="left">Gauche</option>
            <option value="center">Centré</option>
            <option value="right">Droite</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Padding interne</label>
          <select
            className={sel}
            value={String(cs.padding ?? "none")}
            onChange={(e) => patch({ padding: e.target.value })}
          >
            <option value="none">Aucun</option>
            <option value="sm">Petit</option>
            <option value="md">Moyen</option>
            <option value="lg">Grand</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-400 leading-relaxed">
      Sélectionnez une <strong>section</strong>, une <strong>colonne</strong> ou un <strong>bloc</strong> dans l’arborescence pour ajuster ses réglages.
    </p>
  );
}
