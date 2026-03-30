import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { giftCards } from "@/core/db/schema.modules";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { practitionerId, amountCents } = body;
  if (!practitionerId || !amountCents) {
    return NextResponse.json({ error: "practitionerId, amountCents" }, { status: 400 });
  }
  const code = `GC-${randomBytes(4).toString("hex").toUpperCase()}`;
  const db = getDb();
  const [row] = await db
    .insert(giftCards)
    .values({
      code,
      practitionerId,
      buyerUserId: session.user.id,
      amountCents: Number(amountCents),
      status: "pending",
    })
    .returning();
  return NextResponse.json({ giftCard: row });
}
