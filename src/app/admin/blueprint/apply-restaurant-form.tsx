"use client";

import { applyRestaurantBusinessBlueprint } from "./actions";
import { useState } from "react";

export function ApplyRestaurantForm() {
  const willEnable = [
    "Notes",
    "Stripe",
    "Annuaire",
    "Restaurant",
    "Notifications",
    "Click & Collect",
  ];
  const willDisable = [
    "Hébergement",
    "Événements",
    "Blog",
    "Cartes cadeaux",
    "Anamnèse",
    "Rendez-vous classiques",
    "Facturation",
    "Chat",
  ];

  const [pending, setPending] = useState(false);
  const [state, setState] = useState<
    | { ok: true; message: string; hint: string }
    | { ok: false; error: string }
    | null
  >(null);

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-6">
      <h2 className="text-lg font-semibold text-rose-950">Blueprint Restaurant</h2>
      <p className="mt-2 text-sm text-rose-900/90">
        Module <strong>restaurant</strong> : tables + créneaux 90 min + résa publique.
        Seed <code className="rounded bg-white px-1">mon-restaurant</code> + 4 tables.
      </p>
      <div className="mt-3 grid gap-3 rounded border border-rose-200 bg-white p-3 text-xs text-rose-900 sm:grid-cols-2">
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
          <p className="mt-2 text-[11px] text-rose-700">
            Vous pourrez réactiver un module ensuite dans <strong>/admin/modules</strong>.
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await applyRestaurantBusinessBlueprint();
          setState(r.ok ? r : { ok: false, error: r.error });
          setPending(false);
        }}
        className="mt-4 rounded-md bg-rose-800 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "…" : "Appliquer blueprint restaurant"}
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
