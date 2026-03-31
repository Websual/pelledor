"use client";

import { applySalonBusinessBlueprint } from "./actions";
import { useState } from "react";

export function ApplySalonForm() {
  const willEnable = [
    "Notes",
    "Stripe",
    "Annuaire",
    "Rendez-vous classiques",
    "Facturation",
    "Chat",
    "Notifications",
    "Anamnèse",
  ];
  const willDisable = [
    "Hébergement",
    "Restaurant",
    "Événements",
    "Blog",
    "Cartes cadeaux",
    "Devis artisan",
    "Click & Collect",
  ];

  const [pending, setPending] = useState(false);
  const [state, setState] = useState<
    | { ok: true; message: string; hint: string }
    | { ok: false; error: string }
    | null
  >(null);

  return (
    <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/40 p-6">
      <h2 className="text-lg font-semibold text-fuchsia-950">Blueprint Salon</h2>
      <p className="mt-2 text-sm text-fuchsia-900/90">
        Coiffure / barbier : RDV, chat, facturation. Seed{" "}
        <code className="rounded bg-white px-1">mon-salon</code> + 6 prestations.
      </p>
      <div className="mt-3 grid gap-3 rounded border border-fuchsia-200 bg-white p-3 text-xs text-fuchsia-900 sm:grid-cols-2">
        <div>
          <p className="font-semibold">Sera activé</p>
          <ul className="mt-1 space-y-0.5">
            {willEnable.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold">Sera désactivé</p>
          <ul className="mt-1 space-y-0.5">
            {willDisable.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-fuchsia-700">
            Vous pourrez réactiver un module ensuite dans <strong>/admin/modules</strong>.
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await applySalonBusinessBlueprint();
          setState(r.ok ? r : { ok: false, error: r.error });
          setPending(false);
        }}
        className="mt-4 rounded-md bg-fuchsia-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "…" : "Appliquer blueprint salon"}
      </button>
      {state?.ok && (
        <p className="mt-4 text-sm text-green-800">
          {state.message}. Cliquez sur <strong>Mettre à jour le site</strong> pour finaliser.
        </p>
      )}
      {state && !state.ok && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
    </div>
  );
}
