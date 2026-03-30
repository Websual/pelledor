"use client";

import { applyArtisanBusinessBlueprint } from "./actions";
import { useState } from "react";

export function ApplyBusinessForm() {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<
    | { ok: true; seedMessage: string; hint: string }
    | { ok: false; error: string }
    | null
  >(null);

  async function run() {
    setPending(true);
    setState(null);
    try {
      const r = await applyArtisanBusinessBlueprint();
      setState(r.ok ? r : { ok: false, error: r.error });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-6">
      <h2 className="text-lg font-semibold text-amber-950">
        Logique métier (admin)
      </h2>
      <p className="mt-2 text-sm text-amber-900/90">
        Active les <strong>modules utiles à un artisan</strong> (planning,
        factures, Stripe, profil), désactive le superflu (événements, blog…),
        crée un <strong>profil entreprise</strong> lié à votre compte + prestations
        + horaires, et réécrit <code className="rounded bg-white px-1">saas-modules.json</code>{" "}
        pour le prochain <code className="rounded bg-white px-1">pnpm saas:build</code>.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="mt-4 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Application…" : "Appliquer configuration métier Artisan"}
      </button>
      {state?.ok && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900 space-y-3">
          <p className="font-semibold text-green-800">✅ Blueprint Artisan appliqué</p>
          <p>{state.seedMessage}</p>
          <div className="rounded bg-white border border-green-200 p-3">
            <p className="font-medium text-green-900 mb-2">📦 Étape suivante — reconstruire l&apos;app :</p>
            <code className="block whitespace-pre-wrap text-xs text-neutral-700 font-mono bg-neutral-50 rounded p-2 select-all">
              npm run saas:build && npm run build && pm2 restart pelledor
            </code>
            <p className="mt-2 text-xs text-neutral-500">
              Ou en dev : <code className="font-mono bg-neutral-100 px-1 rounded">npm run saas:build</code> puis relancer le serveur.
            </p>
          </div>
          <div className="rounded bg-white border border-green-200 p-3 space-y-2">
            <p className="font-medium text-green-900 mb-1">🔗 Vos liens directs</p>
            <div className="flex flex-col gap-1.5">
              <a href="/" target="_blank" rel="noopener" className="text-xs text-blue-700 hover:underline font-mono">
                / → Vitrine artisan (après rebuild)
              </a>
              <a href="/devis?e=mon-entreprise" target="_blank" rel="noopener" className="text-xs text-blue-700 hover:underline font-mono">
                /devis?e=mon-entreprise → Formulaire devis client
              </a>
              <a href="/admin/devis" className="text-xs text-blue-700 hover:underline font-mono">
                /admin/devis → Vos demandes de devis
              </a>
              <a href="/admin/factures" className="text-xs text-blue-700 hover:underline font-mono">
                /admin/factures → Vos factures
              </a>
            </div>
          </div>
          <p className="text-xs text-neutral-600">{state.hint}</p>
        </div>
      )}
      {state && !state.ok && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
    </div>
  );
}
