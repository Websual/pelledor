import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import {
  cartItems,
  orderItems,
  orders,
  products,
} from "@/core/db/schema.modules";
import { desc, eq, like } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET : liste des commandes (admin). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const list = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt));
  return NextResponse.json({ orders: list });
}

/**
 * POST : créer une commande depuis le panier.
 * Body: email, billingName, billingAddress?, billingCity?, billingPostalCode?, billingCountry?,
 *       shippingName?, shippingAddress?, shippingCity?, shippingPostalCode?, shippingCountry?
 * Returns: { order, orderId } — puis appeler checkout avec orderId pour obtenir l’URL Stripe.
 */
export async function POST(req: Request) {
  const session = await auth();
  const sessionId = session?.user?.id ?? req.headers.get("x-cart-session") ?? "anon-default";
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const billingName = String(body.billingName ?? "").trim();
  if (!email.includes("@") || !billingName)
    return NextResponse.json(
      { error: "email et billingName requis" },
      { status: 400 }
    );

  const db = getDb();
  const items = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      name: products.name,
      priceCents: products.priceCents,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.sessionId, sessionId));
  if (items.length === 0)
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });

  const subtotalCents = items.reduce(
    (s, i) => s + i.quantity * i.priceCents,
    0
  );
  const shippingCents = Math.max(
    0,
    parseInt(body.shippingCents, 10) || 0
  );
  const totalCents = subtotalCents + shippingCents;

  const year = new Date().getFullYear();
  const [last] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(like(orders.orderNumber, `BOUT-${year}-%`))
    .orderBy(desc(orders.orderNumber))
    .limit(1);
  const seq = last
    ? parseInt(last.orderNumber.split("-").pop() ?? "0", 10) + 1
    : 1;
  const orderNumber = `BOUT-${year}-${String(seq).padStart(5, "0")}`;
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: session?.user?.id ?? null,
      email,
      billingName: billingName.slice(0, 255),
      billingAddress: body.billingAddress ? String(body.billingAddress).slice(0, 2000) : null,
      billingCity: body.billingCity ? String(body.billingCity).slice(0, 128) : null,
      billingPostalCode: body.billingPostalCode ? String(body.billingPostalCode).slice(0, 20) : null,
      billingCountry: (body.billingCountry ?? "FR").toString().slice(0, 2).toUpperCase(),
      shippingName: body.shippingName ? String(body.shippingName).slice(0, 255) : null,
      shippingAddress: body.shippingAddress ? String(body.shippingAddress).slice(0, 2000) : null,
      shippingCity: body.shippingCity ? String(body.shippingCity).slice(0, 128) : null,
      shippingPostalCode: body.shippingPostalCode ? String(body.shippingPostalCode).slice(0, 20) : null,
      shippingCountry: body.shippingCountry ? String(body.shippingCountry).slice(0, 2).toUpperCase() : null,
      subtotalCents,
      shippingCents,
      totalCents,
      status: "pending",
    })
    .returning();
  if (!order) return NextResponse.json({ error: "Erreur création commande" }, { status: 500 });

  for (const i of items) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: i.productId,
      productName: i.name,
      quantity: i.quantity,
      priceCents: i.priceCents,
      totalCents: i.quantity * i.priceCents,
    });
  }
  await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));

  return NextResponse.json({ order, orderId: order.id });
}
