"use client";

import { applyHotelBusinessBlueprint } from "./actions";
import { useState } from "react";

export function ApplyHotelForm() {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<
    | {
        ok: true;
        seedMessage: string;
        practitionerSlug: string;
        hint: string;
      }
    | { ok: false; error: string }
    | null
  >(null);

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-6">
      <h2 className="text-lg font-semibold text-sky-950">Blueprint Hôtel</h2>
      <p className="mt-2 text-sm text-sky-900/90">
        Comme le gîte : module <strong>lodging</strong> (nuits + Stripe). Seed{" "}
        <code className="rounded bg-white px-1">mon-hotel</code> + 3 chambres
        (classique, supérieure, suite vue mer).
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await applyHotelBusinessBlueprint();
          setState(
            r.ok
              ? {
                  ok: true,
                  seedMessage: r.seedMessage,
                  practitionerSlug: r.practitionerSlug,
                  hint: r.hint,
                }
              : { ok: false, error: r.error }
          );
          setPending(false);
        }}
        className="mt-4 rounded-md bg-sky-800 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "…" : "Appliquer blueprint hôtel"}
      </button>
      {state?.ok && (
        <p className="mt-4 text-sm text-green-800">
          {state.seedMessage} ({state.practitionerSlug}) — {state.hint}
        </p>
      )}
      {state && !state.ok && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
    </div>
  );
}
