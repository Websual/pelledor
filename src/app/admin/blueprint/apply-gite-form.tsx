"use client";

import { applyGiteBusinessBlueprint } from "./actions";
import { useState } from "react";

export function ApplyGiteForm() {
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
        <strong>2 chambres</strong> publiées, bascule la vitrine template gîte, réécrit{" "}
        <code className="rounded bg-white px-1">saas-modules.json</code>.
      </p>
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
          <p className="mt-2 font-mono text-xs">{state.hint}</p>
        </div>
      )}
      {state && !state.ok && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
    </div>
  );
}
