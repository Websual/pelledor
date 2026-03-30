import { getDb } from "@/core/db/server";
import { roomBookings, rooms } from "@/core/db/schema.modules";
import { rateLimitByIp } from "@/core/security/rate-limit-request";
import { and, eq, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getStripe } from "@/core/stripe";
import { auth } from "@/auth";

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T12:00:00Z").getTime();
  const b = new Date(checkOut + "T12:00:00Z").getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export async function POST(req: Request) {
  if (!(await rateLimitByIp("lodging-checkout", 25, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const roomId = String(body.roomId ?? "").trim();
  const checkIn = String(body.checkIn ?? "").trim();
  const checkOut = String(body.checkOut ?? "").trim();
  const guestEmail = String(body.guestEmail ?? "").trim();
  const guestName = String(body.guestName ?? "").trim();
  if (!roomId || !checkIn || !checkOut || !guestEmail.includes("@"))
    return NextResponse.json({ error: "Champs invalides" }, { status: 400 });
  if (checkOut <= checkIn)
    return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return NextResponse.json({ error: "Min 1 nuit" }, { status: 400 });

  const db = getDb();
  const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
  if (!room?.published)
    return NextResponse.json({ error: "Chambre indisponible" }, { status: 400 });

  const conflicts = await db
    .select({ id: roomBookings.id })
    .from(roomBookings)
    .where(
      and(
        eq(roomBookings.roomId, roomId),
        or(
          eq(roomBookings.status, "confirmed"),
          eq(roomBookings.status, "pending")
        ),
        sql`(${roomBookings.checkIn} < ${checkOut} AND ${roomBookings.checkOut} > ${checkIn})`
      )
    )
    .limit(1);
  if (conflicts.length)
    return NextResponse.json({ error: "Créneau déjà réservé" }, { status: 409 });

  const totalCents = nights * room.priceCentsNight;
  if (totalCents < 1)
    return NextResponse.json({ error: "Prix non configuré" }, { status: 400 });

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [booking] = await db
    .insert(roomBookings)
    .values({
      roomId,
      userId,
      guestEmail,
      guestName: guestName.slice(0, 255),
      checkIn,
      checkOut,
      nights,
      totalCents,
      status: "pending",
    })
    .returning();

  const stripe = getStripe();
  const base =
    process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  if (!stripe) {
    await db.delete(roomBookings).where(eq(roomBookings.id, booking.id));
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 500 });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${room.title} — ${nights} nuit(s)`,
            description: `${checkIn} → ${checkOut}`,
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/hebergement/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/hebergement/${room.slug}?cancel=1`,
    customer_email: guestEmail,
    metadata: {
      purpose: "room_booking",
      bookingId: booking.id,
      userId: userId || "",
    },
  });

  await db
    .update(roomBookings)
    .set({ stripeCheckoutSessionId: checkout.id })
    .where(eq(roomBookings.id, booking.id));

  return NextResponse.json({ url: checkout.url });
}
