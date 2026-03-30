import { getDb } from "@/core/db/server";
import {
  shippingRates,
  shippingZones,
} from "@/core/db/schema.modules";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST : calcul frais de port.
 * Body: { subtotalCents: number, country?: string } (default FR)
 * Returns: { shippingCents: number, zoneName?: string }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const subtotalCents = Math.max(0, parseInt(body.subtotalCents, 10) || 0);
  const country = (String(body.country ?? "FR").toUpperCase().slice(0, 2)) || "FR";
  const db = getDb();
  const zones = await db
    .select()
    .from(shippingZones)
    .orderBy(asc(shippingZones.sortOrder));
  let zoneId: string | null = null;
  let zoneName: string | null = null;
  for (const z of zones) {
    const codes = z.countryCodes.split(",").map((c) => c.trim().toUpperCase());
    if (codes.includes("*") || codes.includes(country)) {
      zoneId = z.id;
      zoneName = z.name;
      break;
    }
  }
  if (!zoneId) {
    return NextResponse.json({
      shippingCents: 0,
      zoneName: null,
      message: "Aucune zone pour ce pays",
    });
  }
  const rates = await db
    .select()
    .from(shippingRates)
    .where(eq(shippingRates.zoneId, zoneId))
    .orderBy(asc(shippingRates.sortOrder), asc(shippingRates.minOrderCents));
  let shippingCents = 0;
  for (const r of rates) {
    if (subtotalCents < r.minOrderCents) continue;
    if (r.maxOrderCents != null && subtotalCents > r.maxOrderCents) continue;
    if (
      r.freeShippingOverCents != null &&
      subtotalCents >= r.freeShippingOverCents
    ) {
      shippingCents = 0;
      break;
    }
    shippingCents = r.priceCents;
    break;
  }
  return NextResponse.json({
    shippingCents,
    zoneName,
  });
}
