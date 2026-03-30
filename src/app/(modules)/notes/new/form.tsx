"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createNote } from "../actions";

export function NewNoteForm({ successRedirect = "/notes" }: { successRedirect?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    const r = await createNote(title, body);
    setPending(false);
    if (!r.ok) {
      setErr(r.error || "Erreur");
      return;
    }
    router.push(successRedirect);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {err && <p className="text-sm text-red-600">{err}</p>}
      <input
        className="w-full rounded border px-3 py-2"
        placeholder="Titre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        className="min-h-32 w-full rounded border px-3 py-2"
        placeholder="Contenu"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        Enregistrer
      </button>
    </form>
  );
}
