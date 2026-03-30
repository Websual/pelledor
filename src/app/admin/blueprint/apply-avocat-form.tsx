"use client";

import { useState } from "react";
import { applyAvocatBusinessBlueprint } from "./actions";

export function ApplyAvocatForm() {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<
    | { ok: true; message: string; hint: string }
    | { ok: false; error: string }
    | null
  >(null);

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Blueprint Avocat</h2>
      <p className="mt-2 text-sm text-slate-700">
        Active RDV, facturation, devis d'honoraires, chat et notifications.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await applyAvocatBusinessBlueprint();
          setState(r.ok ? r : { ok: false, error: r.error });
          setPending(false);
        }}
        className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "..." : "Appliquer blueprint avocat"}
      </button>
      {state?.ok && (
        <p className="mt-4 text-sm text-green-800">
          {state.message} - {state.hint}
        </p>
      )}
      {state && !state.ok && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
    </div>
  );
}
