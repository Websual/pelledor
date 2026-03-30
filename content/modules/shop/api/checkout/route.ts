import { getDb } from "@/core/db/server";
import { orderItems, orders } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getStripe } from "@/core/stripe";

/**
 * POST : créer une session Stripe Checkout pour une commande.
 * Body: { orderId: string }
 * Returns: { url: string }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const orderId = body.orderId;
  if (!orderId)
    return NextResponse.json(
      { error: "orderId requis" },
      { status: 400 }
    );
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order || order.status !== "pending")
    return NextResponse.json(
      { error: "Commande introuvable ou déjà traitée" },
      { status: 400 }
    );
  const lines = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  if (lines.length === 0)
    return NextResponse.json(
      { error: "Commande sans lignes" },
      { status: 400 }
    );

  const stripe = getStripe();
  const base =
    process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  if (!stripe)
    return NextResponse.json(
      { error: "Stripe non configuré" },
      { status: 500 }
    );

  const line_items = lines.map((l) => ({
    price_data: {
      currency: "eur",
      product_data: {
        name: l.productName,
        description: `Qté: ${l.quantity}`,
      },
      unit_amount: l.priceCents,
    },
    quantity: l.quantity,
  }));
  if (order.shippingCents > 0) {
    line_items.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: "Frais de port",
          description: "Livraison de la commande",
        },
        unit_amount: order.shippingCents,
      },
      quantity: 1,
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    success_url: `${base}/boutique/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/boutique/panier?cancel=1`,
    customer_email: order.email,
    metadata: {
      purpose: "shop_order",
      orderId: order.id,
    },
  });

  await db
    .update(orders)
    .set({
      stripeCheckoutSessionId: checkout.id,
    })
    .where(eq(orders.id, order.id));

  return NextResponse.json({ url: checkout.url });
}
