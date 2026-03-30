"use client";

import { useState } from "react";

export function AddToCartForm({ productId }: { productId: string }) {
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  return (
    <form
      className="mt-6 flex items-center gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("loading");
        try {
          const res = await fetch("/api/modules/shop/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ productId, quantity: qty }),
          });
          if (!res.ok) {
            setStatus("error");
            return;
          }
          setStatus("done");
        } catch {
          setStatus("error");
        }
      }}
    >
      <label className="text-sm text-neutral-600">
        Quantité
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="ml-2 w-16 rounded border px-2 py-1 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {status === "loading" ? "…" : "Ajouter au panier"}
      </button>
      {status === "done" && (
        <span className="text-sm text-green-600">Ajouté.</span>
      )}
      {status === "error" && (
        <span className="text-sm text-red-600">Erreur.</span>
      )}
    </form>
  );
}
