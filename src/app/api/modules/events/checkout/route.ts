import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { events } from "@/core/db/schema.modules";
import { rateLimitMemory } from "@/core/security/rate-limit-memory";
import { rateLimitByIp } from "@/core/security/rate-limit-request";
import { getStripe } from "@/core/stripe";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await rateLimitByIp("events-checkout", 40, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429 }
    );
  }
  if (!rateLimitMemory(`events-checkout:user:${session.user.id}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const eventId = body.eventId as string;
  const quantity = Math.min(10, Math.max(1, parseInt(body.quantity, 10) || 1));
  if (!eventId) return NextResponse.json({ error: "eventId" }, { status: 400 });
  const stripe = getStripe();
  if (!stripe)
    return NextResponse.json({ error: "Stripe non configure" }, { status: 500 });
  const db = getDb();
  const ev = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!ev || ev.status !== "active")
    return NextResponse.json({ error: "Event introuvable" }, { status: 404 });
  if (ev.remainingPlaces < quantity)
    return NextResponse.json({ error: "Pas assez de places" }, { status: 400 });
  const base =
    process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: ev.title },
          unit_amount: ev.priceCents,
        },
        quantity,
      },
    ],
    success_url: `${base}/evenements/${ev.slug}?merci=1`,
    cancel_url: `${base}/evenements/${ev.slug}`,
    metadata: {
      userId: session.user.id,
      purpose: "event_ticket",
      eventId: ev.id,
      quantity: String(quantity),
    },
    customer_email: session.user.email || undefined,
  });
  return NextResponse.json({ url: checkout.url });
}
