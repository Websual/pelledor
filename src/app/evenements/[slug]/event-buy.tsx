"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventBuy({
  eventId,
  slug,
  disabled,
}: {
  eventId: string;
  slug: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState<string | null>(null);

  async function pay() {
    setErr(null);
    const r = await fetch("/api/modules/events/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, quantity: qty }),
    });
    if (r.status === 401) {
      router.push("/login?callbackUrl=" + encodeURIComponent(`/evenements/${slug}`));
      return;
    }
    const j = await r.json().catch(() => ({}));
    if (j.url) window.location.href = j.url;
    else setErr(j.error || "Echec");
  }

  return (
    <div className="mt-8 rounded border p-4">
      <label className="block text-sm">
        Places
        <input
          type="number"
          min={1}
          max={10}
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
          className="ml-2 w-16 rounded border px-2 py-1"
        />
      </label>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <button
        type="button"
        disabled={disabled}
        onClick={pay}
        className="mt-4 w-full rounded bg-neutral-900 py-2 text-sm text-white disabled:opacity-50"
      >
        Payer avec Stripe
      </button>
    </div>
  );
}
