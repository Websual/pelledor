import { getDb } from "@/core/db/server";
import { giftCards } from "@/core/db/schema.modules";
import { rateLimitByIp } from "@/core/security/rate-limit-request";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  if (!(await rateLimitByIp("gift-validate", 60, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code" }, { status: 400 });
  const normalized = code.toUpperCase().trim().slice(0, 64);
  if (normalized.length < 4) {
    return NextResponse.json({ valid: false });
  }
  const db = getDb();
  const row = await db.query.giftCards.findFirst({
    where: eq(giftCards.code, normalized),
  });
  if (!row || row.status !== "pending") {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({
    valid: true,
    amountCents: row.amountCents,
    status: row.status,
  });
}
