import { getDb } from "@/core/db/server";
import { giftCards } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code" }, { status: 400 });
  const db = getDb();
  const row = await db.query.giftCards.findFirst({
    where: eq(giftCards.code, code.toUpperCase().trim()),
  });
  if (!row) return NextResponse.json({ valid: false });
  return NextResponse.json({
    valid: row.status === "pending",
    amountCents: row.amountCents,
    status: row.status,
  });
}
