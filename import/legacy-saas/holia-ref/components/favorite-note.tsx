"use client";

import { useState, useEffect, useCallback } from "react";
import { StickyNote } from "lucide-react";

interface FavoriteNoteProps {
  favoriteId: string;
  initialNote: string | null;
  onSave: (favoriteId: string, note: string) => Promise<void>;
  isSaving?: boolean;
}

const DEBOUNCE_MS = 500;

export function FavoriteNote({
  favoriteId,
  initialNote,
  onSave,
  isSaving = false,
}: FavoriteNoteProps) {
  const [note, setNote] = useState(initialNote || "");
  const [isExpanded, setIsExpanded] = useState(Boolean(initialNote?.trim()));
  const [localSaving, setLocalSaving] = useState(false);

  useEffect(() => {
    setNote(initialNote || "");
    if (initialNote?.trim()) setIsExpanded(true);
  }, [favoriteId, initialNote]);

  const saveNote = useCallback(
    async (value: string) => {
      if (value === (initialNote || "")) return;
      setLocalSaving(true);
      try {
        await onSave(favoriteId, value);
      } finally {
        setLocalSaving(false);
      }
    },
    [favoriteId, initialNote, onSave]
  );

  useEffect(() => {
    if (note === (initialNote || "")) return;
    const timer = setTimeout(() => {
      saveNote(note);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [note, initialNote, saveNote]);

  const hasNote = Boolean(note.trim()) || Boolean(initialNote?.trim());

  return (
    <div className="mt-2">
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-600/80 transition-colors"
          title={hasNote ? "Modifier la note" : "Ajouter une note"}
        >
          <StickyNote className="h-3.5 w-3.5" />
          <span>
            {hasNote
              ? (note.trim() || initialNote || "").slice(0, 40) + ((note.trim() || initialNote || "").length > 40 ? "…" : "")
              : "Ajouter une note"}
          </span>
        </button>
      ) : (
        <div
          className="relative p-2.5 rounded-2xl border border-amber-200/60 bg-amber-50/40 shadow-sm"
          style={{ maxWidth: "100%" }}
        >
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (!note.trim()) setIsExpanded(false);
            }}
            placeholder="Note privée (ex: horaires préférés, rappel...)"
            rows={2}
            className="w-full text-xs text-slate-600 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-slate-400"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-400">
              {localSaving ? "Enregistrement..." : "Sauvegardé automatiquement"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                if (!note.trim()) saveNote("");
              }}
              className="text-[10px] text-slate-400 hover:text-slate-600"
            >
              Réduire
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
