import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/core/db/server";
import { noteAccess } from "@/core/db/schema";
import { events, orders, roomBookings, tickets } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { getStripe } from "@/core/stripe";
import { Hooks } from "@/core/events/hooks";
import Stripe from "stripe";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe non configure" }, { status: 500 });
  }
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }
    const db = getDb();
    const purpose = s.metadata?.purpose;
    const userId = s.metadata?.userId;
    const eventId = s.metadata?.eventId;
    const qty = Math.max(1, parseInt(s.metadata?.quantity || "1", 10) || 1);

    if (purpose === "event_ticket" && userId && eventId) {
      const ev = await db.query.events.findFirst({ where: eq(events.id, eventId) });
      if (ev && ev.remainingPlaces >= qty) {
        await db.insert(tickets).values({
          eventId,
          userId,
          quantity: qty,
          amountCents: ev.priceCents * qty,
          status: "confirmed",
        });
        await db
          .update(events)
          .set({ remainingPlaces: ev.remainingPlaces - qty })
          .where(eq(events.id, eventId));
        await Hooks.doAction("ticket_purchased", {
          eventId,
          userId,
          quantity: qty,
          amountCents: ev.priceCents * qty,
        });
      }
    } else if (purpose === "room_booking" && s.metadata?.bookingId) {
      await db
        .update(roomBookings)
        .set({ status: "confirmed", stripeCheckoutSessionId: s.id })
        .where(eq(roomBookings.id, s.metadata.bookingId));
    } else if (purpose === "shop_order" && s.metadata?.orderId) {
      await db
        .update(orders)
        .set({ status: "paid", stripeCheckoutSessionId: s.id })
        .where(eq(orders.id, s.metadata.orderId));
    } else if (userId && (purpose === "notes" || !purpose)) {
      await db
        .insert(noteAccess)
        .values({
          userId,
          stripeCheckoutSessionId: s.id,
        })
        .onConflictDoUpdate({
          target: noteAccess.userId,
          set: {
            grantedAt: new Date(),
            stripeCheckoutSessionId: s.id,
          },
        });
    }
  }
  return NextResponse.json({ received: true });
}
