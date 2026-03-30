"use client";

import { applyBoutiqueBusinessBlueprint } from "./actions";
import { useState } from "react";

export function ApplyBoutiqueForm() {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<
    | { ok: true; message: string; hint: string }
    | { ok: false; error: string }
    | null
  >(null);

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-6">
      <h2 className="text-lg font-semibold text-violet-950">
        Blueprint Boutique (e‑commerce)
      </h2>
      <p className="mt-2 text-sm text-violet-900/90">
        Module <strong>shop</strong> : catalogue, panier, commande, frais de
        port, paiement Stripe. Pas de template vitrine : la home affiche un lien
        vers <code className="rounded bg-white px-1">/boutique</code>.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await applyBoutiqueBusinessBlueprint();
          setState(r.ok ? r : { ok: false, error: r.error });
          setPending(false);
        }}
        className="mt-4 rounded-md bg-violet-800 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "…" : "Appliquer blueprint boutique"}
      </button>
      {state?.ok && (
        <p className="mt-4 text-sm text-green-800">
          {state.message} — {state.hint}
        </p>
      )}
      {state && !state.ok && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
    </div>
  );
}
