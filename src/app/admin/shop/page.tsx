import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import {
  orderItems,
  orders,
  products,
  shippingRates,
  shippingZones,
} from "@/core/db/schema.modules";
import { desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShopClient } from "./client";

export default async function AdminShopPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const db = getDb();
  const [productsList, ordersList, zones, rates] = await Promise.all([
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(50),
    db.select().from(shippingZones).orderBy(shippingZones.sortOrder),
    db.select().from(shippingRates).orderBy(shippingRates.sortOrder),
  ]);
  const orderIds = ordersList.map((o) => o.id);
  const allItems =
    orderIds.length > 0
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
      : [];
  const itemsByOrderId = allItems.reduce(
    (acc, i) => {
      if (!acc[i.orderId]) acc[i.orderId] = [];
      acc[i.orderId].push(i);
      return acc;
    },
    {} as Record<string, typeof allItems>
  );

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Boutique / E‑commerce</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Catalogue : <Link href="/boutique" className="text-blue-600 underline">/boutique</Link> —
        Panier, commande, frais de port et paiement Stripe.
      </p>
      <AdminShopClient
        initialProducts={productsList}
        initialOrders={ordersList.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))}
        itemsByOrderId={itemsByOrderId}
        zones={zones}
        rates={rates}
      />
    </div>
  );
}
