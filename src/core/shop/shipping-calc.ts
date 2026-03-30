import { getDb } from "@/core/db/server";
import { shippingRates, shippingZones } from "@/core/db/schema.modules";
import { asc, eq } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

/**
 * Même logique que POST /api/modules/shop/shipping/rates — source de vérité serveur pour les commandes.
 */
export async function computeShippingCents(
  db: Db,
  subtotalCents: number,
  countryRaw: string
): Promise<{ shippingCents: number; zoneName: string | null }> {
  const subtotal = Math.max(0, Math.floor(subtotalCents));
  const country = (countryRaw || "FR").toUpperCase().slice(0, 2) || "FR";
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
    return { shippingCents: 0, zoneName: null };
  }
  const rates = await db
    .select()
    .from(shippingRates)
    .where(eq(shippingRates.zoneId, zoneId))
    .orderBy(asc(shippingRates.sortOrder), asc(shippingRates.minOrderCents));
  let shippingCents = 0;
  for (const r of rates) {
    if (subtotal < r.minOrderCents) continue;
    if (r.maxOrderCents != null && subtotal > r.maxOrderCents) continue;
    if (
      r.freeShippingOverCents != null &&
      subtotal >= r.freeShippingOverCents
    ) {
      shippingCents = 0;
      break;
    }
    shippingCents = r.priceCents;
    break;
  }
  return { shippingCents, zoneName };
}
