import { auth } from "@/auth";
import { getStripe } from "@/core/stripe";
import { NextResponse } from "next/server";

/** Checkout Stripe pour debloquer les notes (prix en centimes STRIPE_NOTE_PRICE_CENTS). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stripe = getStripe();
  const priceId = process.env.STRIPE_NOTE_PRICE_ID?.trim();
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe non configure" }, { status: 500 });
  }
  const base =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  if (priceId) {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/notes?paid=1`,
      cancel_url: `${base}/notes/billing`,
      metadata: { userId: session.user.id, purpose: "notes" },
      customer_email: session.user.email || undefined,
    });
    return NextResponse.json({ url: checkout.url });
  }
  const amount = parseInt(process.env.STRIPE_NOTE_PRICE_CENTS || "500", 10);
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Acces creation de notes" },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/notes?paid=1`,
    cancel_url: `${base}/notes/billing`,
    metadata: { userId: session.user.id, purpose: "notes" },
    customer_email: session.user.email || undefined,
  });
  return NextResponse.json({ url: checkout.url });
}
