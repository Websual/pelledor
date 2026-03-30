import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { giftCards } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** Utilise une carte (statut pending → redeemed). Optionnel : lier au RDV plus tard. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: "code" }, { status: 400 });
  const db = getDb();
  const row = await db.query.giftCards.findFirst({
    where: eq(giftCards.code, String(code).toUpperCase().trim()),
  });
  if (!row || row.status !== "pending")
    return NextResponse.json({ error: "Code invalide ou deja utilise" }, { status: 400 });
  await db
    .update(giftCards)
    .set({ status: "redeemed", buyerUserId: row.buyerUserId })
    .where(eq(giftCards.id, row.id));
  return NextResponse.json({
    ok: true,
    amountCents: row.amountCents,
    practitionerId: row.practitionerId,
  });
}
