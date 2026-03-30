"use client";

import { deleteNote } from "./actions";

export function DeleteNote({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="text-xs text-red-600 underline"
      onClick={() => deleteNote(id)}
    >
      Supprimer
    </button>
  );
}
