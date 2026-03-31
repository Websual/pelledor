"use client";

import { applyGiteBusinessBlueprint } from "./actions";
import { useState } from "react";

export function ApplyGiteForm() {
  const willEnable = ["Notes", "Stripe", "Annuaire", "Hébergement", "Notifications"];
  const willDisable = [
    "Rendez-vous classiques",
    "Facturation",
    "Événements",
    "Blog",
    "Cartes cadeaux",
    "Chat",
  ];

  const [pending, setPending] = useState(false);
  const [state, setState] = useState<
    | {
        ok: true;
        seedMessage: string;
        hint: string;
        practitionerSlug: string;
      }
    | { ok: false; error: string }
    | null
  >(null);

  async function run() {
    setPending(true);
    setState(null);
    try {
      const r = await applyGiteBusinessBlueprint();
      setState(r.ok ? r : { ok: false, error: r.error });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-6">
      <h2 className="text-lg font-semibold text-emerald-950">Blueprint Gîte / chambres d’hôtes</h2>
      <p className="mt-2 text-sm text-emerald-900/90">
        Active le module <strong>lodging</strong>, désactive le booking « RDV classique »,
        crée l’établissement <code className="rounded bg-white px-1">mon-gite</code> et{" "}
        <strong>2 chambres</strong> publiées, et prépare la vitrine gîte.
      </p>
      <div className="mt-3 grid gap-3 rounded border border-emerald-200 bg-white p-3 text-xs text-emerald-900 sm:grid-cols-2">
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
          <p className="mt-2 text-[11px] text-emerald-700">
            Vous pourrez réactiver un module ensuite dans <strong>/admin/modules</strong>.
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="mt-4 rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "…" : "Appliquer blueprint gîte"}
      </button>
      {state?.ok && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm">
          <p>{state.seedMessage}</p>
          <p className="mt-2 text-xs text-green-800">
            Cliquez sur <strong>Mettre à jour le site</strong> pour finaliser.
          </p>
        </div>
      )}
      {state && !state.ok && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
    </div>
  );
}
