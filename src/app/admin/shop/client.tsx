"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  published: boolean;
  stock: number | null;
};
type Order = {
  id: string;
  orderNumber: string;
  email: string;
  totalCents: number;
  status: string;
  createdAt: string;
};
type OrderItem = {
  productName: string;
  quantity: number;
  totalCents: number;
};
type Zone = { id: string; name: string; countryCodes: string };
type Rate = {
  id: string;
  zoneId: string;
  minOrderCents: number;
  maxOrderCents: number | null;
  priceCents: number;
  freeShippingOverCents: number | null;
};

export function AdminShopClient({
  initialProducts,
  initialOrders,
  itemsByOrderId,
  zones,
  rates,
}: {
  initialProducts: Product[];
  initialOrders: Order[];
  itemsByOrderId: Record<string, OrderItem[]>;
  zones: Zone[];
  rates: Rate[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function createProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/modules/shop/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        slug: fd.get("slug"),
        description: fd.get("description") || undefined,
        priceCents: parseInt(String(fd.get("priceCents")), 10) || 0,
        imageUrl: fd.get("imageUrl") || undefined,
        published: fd.get("published") === "on",
        stock: fd.get("stock") ? parseInt(String(fd.get("stock")), 10) : null,
      }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Produit créé" : j.error || "Erreur");
    if (r.ok) router.refresh();
  }

  return (
    <div className="mt-8 space-y-10">
      {msg && (
        <p className={`text-sm ${msg.startsWith("Produit") ? "text-green-600" : "text-red-600"}`}>
          {msg}
        </p>
      )}

      <section>
        <h2 className="font-medium">Produits</h2>
        <form onSubmit={createProduct} className="mt-4 space-y-2 rounded border bg-white p-4">
          <input name="name" placeholder="Nom *" className="w-full rounded border px-2 py-1 text-sm" required />
          <input
            name="slug"
            placeholder="slug-url *"
            className="w-full rounded border px-2 py-1 text-sm"
            required
          />
          <textarea name="description" placeholder="Description" className="w-full rounded border px-2 py-1 text-sm" rows={2} />
          <div className="flex gap-2">
            <input
              name="priceCents"
              type="number"
              placeholder="Prix (centimes)"
              defaultValue={0}
              className="w-32 rounded border px-2 py-1 text-sm"
            />
            <input name="stock" type="number" placeholder="Stock (vide = illimité)" className="w-32 rounded border px-2 py-1 text-sm" />
          </div>
          <input name="imageUrl" placeholder="URL image" className="w-full rounded border px-2 py-1 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" /> Publié
          </label>
          <button type="submit" className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white">
            Ajouter
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {initialProducts.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
              <span>
                {p.name} — {(p.priceCents / 100).toFixed(2)} € {!p.published && "(brouillon)"}
              </span>
              <a href={`/boutique/produit/${p.slug}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                Voir
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium">Commandes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4">N°</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Statut</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {initialOrders.map((o) => (
                <tr key={o.id} className="border-b">
                  <td className="py-2 pr-4 font-mono">{o.orderNumber}</td>
                  <td className="py-2 pr-4">{o.email}</td>
                  <td className="py-2 pr-4">{(o.totalCents / 100).toFixed(2)} €</td>
                  <td className="py-2 pr-4">{o.status}</td>
                  <td className="py-2">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {initialOrders.length === 0 && (
            <p className="py-4 text-sm text-neutral-500">Aucune commande.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-medium">Frais de port</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Zones : {zones.length ? zones.map((z) => `${z.name} (${z.countryCodes})`).join(", ") : "Aucune. Ajoutez une zone (ex. FR ou *) et des tarifs dans la base."}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Tarifs : {rates.length} règle(s). Calcul au checkout selon sous-total et pays.
        </p>
      </section>
    </div>
  );
}
