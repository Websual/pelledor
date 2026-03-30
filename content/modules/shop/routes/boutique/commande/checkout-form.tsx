"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function CheckoutForm() {
  const [cart, setCart] = useState<{ subtotalCents: number } | null>(null);
  const [shippingCents, setShippingCents] = useState(0);
  const [country, setCountry] = useState("FR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/modules/shop/cart", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCart({ subtotalCents: data.subtotalCents ?? 0 }));
  }, []);

  useEffect(() => {
    if (!cart || cart.subtotalCents === 0) return;
    fetch("/api/modules/shop/shipping/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subtotalCents: cart.subtotalCents, country }),
    })
      .then((r) => r.json())
      .then((data) => setShippingCents(data.shippingCents ?? 0));
  }, [cart?.subtotalCents, country]);

  const totalCents = (cart?.subtotalCents ?? 0) + shippingCents;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const orderRes = await fetch("/api/modules/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: fd.get("email"),
          billingName: fd.get("billingName"),
          billingAddress: fd.get("billingAddress") || undefined,
          billingCity: fd.get("billingCity") || undefined,
          billingPostalCode: fd.get("billingPostalCode") || undefined,
          billingCountry: fd.get("billingCountry") || "FR",
          shippingName: fd.get("shippingName") || undefined,
          shippingAddress: fd.get("shippingAddress") || undefined,
          shippingCity: fd.get("shippingCity") || undefined,
          shippingPostalCode: fd.get("shippingPostalCode") || undefined,
          shippingCountry: fd.get("shippingCountry") || undefined,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setError(orderData.error || "Erreur création commande");
        setLoading(false);
        return;
      }
      const checkoutRes = await fetch("/api/modules/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId: orderData.orderId,
          checkoutToken: orderData.checkoutToken as string | undefined,
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutData.url) {
        setError("Erreur paiement");
        setLoading(false);
        return;
      }
      window.location.href = checkoutData.url;
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  if (!cart) return <p className="mt-4 text-sm text-neutral-500">Chargement…</p>;
  if (cart.subtotalCents === 0)
    return (
      <p className="mt-4 text-sm text-neutral-600">
        Panier vide. <Link href="/boutique" className="text-blue-600 underline">Catalogue</Link>.
      </p>
    );

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label className="block text-sm font-medium">Email *</label>
        <input name="email" type="email" required className="mt-1 w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Nom (facturation) *</label>
        <input name="billingName" type="text" required className="mt-1 w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Adresse facturation</label>
        <input name="billingAddress" type="text" className="mt-1 w-full rounded border px-3 py-2" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Ville</label>
          <input name="billingCity" type="text" className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Code postal</label>
          <input name="billingPostalCode" type="text" className="mt-1 w-full rounded border px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">Pays</label>
        <select
          name="billingCountry"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="FR">France</option>
          <option value="BE">Belgique</option>
          <option value="CH">Suisse</option>
        </select>
      </div>
      <div className="rounded-lg border bg-neutral-50 p-4">
        <p className="text-sm">
          Sous-total : {(cart.subtotalCents / 100).toFixed(2)} €
        </p>
        <p className="text-sm">
          Frais de port : {(shippingCents / 100).toFixed(2)} €
        </p>
        <p className="mt-2 font-medium">
          Total : {(totalCents / 100).toFixed(2)} €
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-neutral-900 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Redirection vers le paiement…" : "Payer avec Stripe"}
      </button>
    </form>
  );
}
