import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { giftCards } from "@/core/db/schema.modules";
import { rateLimitMemory } from "@/core/security/rate-limit-memory";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/** Montants en centimes (min 5 €, max 2500 €). */
const GIFT_MIN_CENTS = 500;
const GIFT_MAX_CENTS = 250_000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  if (!rateLimitMemory(`gift-issue:${session.user.id}`, 120, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop d'émissions. Réessayez plus tard." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const { practitionerId, amountCents } = body;
  if (!practitionerId || amountCents == null) {
    return NextResponse.json({ error: "practitionerId, amountCents" }, { status: 400 });
  }
  const cents = Number(amountCents);
  if (
    !Number.isFinite(cents) ||
    !Number.isInteger(cents) ||
    cents < GIFT_MIN_CENTS ||
    cents > GIFT_MAX_CENTS
  ) {
    return NextResponse.json(
      { error: `Montant invalide (${GIFT_MIN_CENTS / 100}–${GIFT_MAX_CENTS / 100} €)` },
      { status: 400 }
    );
  }
  const code = `GC-${randomBytes(4).toString("hex").toUpperCase()}`;
  const db = getDb();
  const [row] = await db
    .insert(giftCards)
    .values({
      code,
      practitionerId,
      buyerUserId: session.user.id,
      amountCents: cents,
      status: "pending",
    })
    .returning();
  return NextResponse.json({ giftCard: row });
}
