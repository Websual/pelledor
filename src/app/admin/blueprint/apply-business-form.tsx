"use client";

import { applyArtisanBusinessBlueprint } from "./actions";
import { useState } from "react";

export function ApplyBusinessForm() {
  const willEnable = [
    "Profil entreprise",
    "Planning & rendez-vous",
    "Devis & factures",
    "Paiements Stripe",
    "Notifications",
    "Blog",
  ];
  const willDisable = ["Événements", "Cartes cadeaux", "Chat"];

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
        factures, Stripe, profil), désactive le superflu (événements, chat,
        cartes cadeaux),
        crée un <strong>profil entreprise</strong> lié à votre compte + prestations
        + horaires.
      </p>
      <div className="mt-3 grid gap-3 rounded border border-amber-200 bg-white p-3 text-xs text-amber-900 sm:grid-cols-2">
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
          <p className="mt-2 text-[11px] text-amber-700">
            Vous pourrez toujours réactiver un module ensuite dans
            <strong> /admin/modules</strong>.
          </p>
        </div>
      </div>
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
            <p className="font-medium text-green-900 mb-2">Étape suivante</p>
            <p className="text-xs text-neutral-700">
              Cliquez sur <strong>Mettre à jour le site</strong> juste en dessous
              pour finaliser l&apos;activation.
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
          <p className="text-xs text-neutral-600">
            Vos nouveaux réglages sont prêts.
          </p>
        </div>
      )}
      {state && !state.ok && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
    </div>
  );
}
