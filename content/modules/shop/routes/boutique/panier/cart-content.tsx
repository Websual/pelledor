"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  priceCents: number;
  totalCents: number;
  imageUrl?: string | null;
};

export function CartContent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/modules/shop/cart", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setCart(data.cart ?? []);
        setSubtotalCents(data.subtotalCents ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateQty = async (productId: string, quantity: number) => {
    const res = await fetch("/api/modules/shop/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId, quantity }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.cart !== undefined) {
      setCart(data.cart);
      setSubtotalCents(data.subtotalCents ?? 0);
    } else {
      const list = await fetch("/api/modules/shop/cart", {
        credentials: "include",
      }).then((r) => r.json());
      setCart(list.cart ?? []);
      setSubtotalCents(list.subtotalCents ?? 0);
    }
  };

  if (loading) return <p className="mt-4 text-sm text-neutral-500">Chargement…</p>;
  if (cart.length === 0)
    return (
      <p className="mt-4 text-sm text-neutral-600">
        Votre panier est vide.{" "}
        <Link href="/boutique" className="text-blue-600 underline">
          Voir le catalogue
        </Link>
        .
      </p>
    );

  return (
    <ul className="mt-6 space-y-4">
      {cart.map((i) => (
        <li key={i.id} className="flex items-center justify-between border-b pb-4">
          <div className="flex gap-4">
            {i.imageUrl ? (
              <img src={i.imageUrl} alt="" className="h-16 w-16 rounded object-cover" />
            ) : (
              <div className="h-16 w-16 rounded bg-neutral-100" />
            )}
            <div>
              <Link href={`/boutique/produit/${i.slug}`} className="font-medium hover:underline">
                {i.name}
              </Link>
              <p className="text-sm text-neutral-600">
                {(i.priceCents / 100).toFixed(2)} € × {i.quantity} = {(i.totalCents / 100).toFixed(2)} €
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateQty(i.productId, Math.max(0, i.quantity - 1))}
              className="rounded border px-2 py-0.5 text-sm"
            >
              −
            </button>
            <span className="w-6 text-center text-sm">{i.quantity}</span>
            <button
              type="button"
              onClick={() => updateQty(i.productId, i.quantity + 1)}
              className="rounded border px-2 py-0.5 text-sm"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => updateQty(i.productId, 0)}
              className="ml-2 text-sm text-red-600 underline"
            >
              Retirer
            </button>
          </div>
        </li>
      ))}
      <li className="border-t pt-4 font-medium">
        Sous-total : {(subtotalCents / 100).toFixed(2)} € (frais de port calculés à l’étape suivante)
      </li>
    </ul>
  );
}
