"use client";

import { applyCabinetBusinessBlueprint } from "./actions";
import { useState } from "react";

export function ApplyCabinetForm() {
  const willEnable = [
    "Notes",
    "Stripe",
    "Annuaire",
    "Rendez-vous classiques",
    "Facturation",
    "Chat",
    "Notifications",
  ];
  const willDisable = [
    "Hébergement",
    "Restaurant",
    "Événements",
    "Blog",
    "Cartes cadeaux",
    "Devis artisan",
  ];

  const [pending, setPending] = useState(false);
  const [state, setState] = useState<
    | { ok: true; message: string; hint: string }
    | { ok: false; error: string }
    | null
  >(null);

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Blueprint Cabinet
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        Vitrine « cabinet » (conseil, juridique, experts). Même stack que
        praticien : RDV, factures, chat, annuaire. Seed{" "}
        <code className="rounded bg-white px-1">mon-cabinet</code> + 4
        prestations (nouveau compte).
      </p>
      <div className="mt-3 grid gap-3 rounded border border-slate-300 bg-white p-3 text-xs text-slate-800 sm:grid-cols-2">
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
          <p className="mt-2 text-[11px] text-slate-600">
            Vous pourrez réactiver un module ensuite dans <strong>/admin/modules</strong>.
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await applyCabinetBusinessBlueprint();
          setState(r.ok ? r : { ok: false, error: r.error });
          setPending(false);
        }}
        className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "…" : "Appliquer blueprint cabinet"}
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
