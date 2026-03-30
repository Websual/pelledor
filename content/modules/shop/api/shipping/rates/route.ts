import { getDb } from "@/core/db/server";
import { computeShippingCents } from "@/core/shop/shipping-calc";
import { NextResponse } from "next/server";

/**
 * POST : calcul frais de port.
 * Body: { subtotalCents: number, country?: string } (default FR)
 * Returns: { shippingCents: number, zoneName?: string }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const subtotalCents = Math.max(0, parseInt(body.subtotalCents, 10) || 0);
  const country = String(body.country ?? "FR").toUpperCase().slice(0, 2) || "FR";
  const db = getDb();
  const { shippingCents, zoneName } = await computeShippingCents(
    db,
    subtotalCents,
    country
  );
  return NextResponse.json({
    shippingCents,
    zoneName,
  });
}
