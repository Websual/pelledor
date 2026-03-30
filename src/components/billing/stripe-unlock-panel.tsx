"use client";

import Link from "next/link";
import { useState } from "react";

type Props = { backHref: string; backLabel?: string };

export function StripeUnlockPanel({ backHref, backLabel = "Retour" }: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pay() {
    setErr(null);
    setLoading(true);
    const r = await fetch("/api/modules/stripe/checkout", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setLoading(false);
    if (j.url) window.location.href = j.url;
    else setErr(j.error || "Echec checkout");
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href={backHref} className="text-sm underline">
        {backLabel}
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Debloquer les notes</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Paiement unique (Stripe). Apres paiement, webhook enregistre l acces.
      </p>
      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      <button
        type="button"
        disabled={loading}
        onClick={pay}
        className="mt-6 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Redirection…" : "Payer avec Stripe"}
      </button>
    </main>
  );
}
