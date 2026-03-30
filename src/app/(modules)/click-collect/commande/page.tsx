"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Product = { id: string; name: string; description?: string | null; priceCents: number };
type CartItem = { product: Product; qty: number };

function CommandePage() {
  const searchParams = useSearchParams();
  const establishment = searchParams.get("e") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("12:00");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!establishment) return;
    fetch(`/api/modules/click-collect/cc-products?e=${establishment}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []));
  }, [establishment]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((x) => x.product.id === product.id);
      if (existing) return prev.map((x) => x.product.id === product.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { product, qty: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((x) => x.product.id !== productId));
  }

  const total = cart.reduce((sum, item) => sum + item.product.priceCents * item.qty, 0);

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pickupSlot = new Date(`${pickupDate}T${pickupTime}:00`).toISOString();
    const res = await fetch("/api/modules/click-collect/cc-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishment,
        clientName,
        clientEmail,
        clientPhone,
        pickupSlot,
        items: cart.map((x) => ({
          productId: x.product.id,
          name: x.product.name,
          qty: x.qty,
          priceCents: x.product.priceCents,
        })),
      }),
    });
    const data = await res.json();
    if (data.ok) setSubmitted(true);
    else setError(data.error ?? "Erreur lors de la commande");
  }

  if (submitted)
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">Commande confirmée !</h1>
          <p className="text-gray-600">Votre commande a été enregistrée. Présentez-vous à l'heure choisie.</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Commander à emporter</h1>

        {/* Catalogue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{p.name}</p>
                {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                <p className="text-blue-600 font-semibold mt-1">{(p.priceCents / 100).toFixed(2)} €</p>
              </div>
              <button
                onClick={() => addToCart(p)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
              >
                + Ajouter
              </button>
            </div>
          ))}
        </div>

        {/* Panier */}
        {cart.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <h2 className="font-semibold mb-3">Votre panier</h2>
            {cart.map((item) => (
              <div key={item.product.id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                <span className="text-sm">{item.product.name} × {item.qty}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{((item.product.priceCents * item.qty) / 100).toFixed(2)} €</span>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 text-xs">✕</button>
                </div>
              </div>
            ))}
            <div className="flex justify-between mt-3 font-bold">
              <span>Total</span>
              <span>{(total / 100).toFixed(2)} €</span>
            </div>
          </div>
        )}

        {/* Formulaire */}
        {cart.length > 0 && (
          <form onSubmit={handleOrder} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold mb-1">Vos coordonnées & créneau</h2>
            <input type="text" required placeholder="Votre nom *" value={clientName} onChange={(e) => setClientName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="email" required placeholder="Email *" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="tel" placeholder="Téléphone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-3">
              <input type="date" required value={pickupDate} onChange={(e) => setPickupDate(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input type="time" required value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition">
              🛒 Confirmer ma commande — {(total / 100).toFixed(2)} €
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CommandePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" /></div>}>
      <CommandePage />
    </Suspense>
  );
}
