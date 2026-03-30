/**
 * Calcule le prix d'un service en tenant compte des promotions marketing actives.
 * Si une promotion est active (date du jour entre start_date et end_date),
 * retourne le prix remisé. Sinon retourne le prix normal.
 */

import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export type ServiceWithPrice = {
  id: string;
  practitioner_id: string;
  price_cents: number;
  name?: string;
  [key: string]: unknown;
};

export interface GetServicePriceResult {
  priceCents: number;
  originalPriceCents: number;
  discountPercentage: number | null;
  hasPromo: boolean;
}

/**
 * Retourne le prix effectif du service (remisé si promo active).
 * Utilisé par Stripe (create-checkout, create-booking-session) pour facturer le discountedPrice.
 * Vérifie les MarketingPosts type PROMOTION (discount_percentage défini) :
 * - practitioner_id correspond
 * - service_id est null (tous services) OU service_id correspond
 * - date du jour entre start_date et end_date
 * Si plusieurs promos s'appliquent, prend la remise maximale.
 */
export async function getServicePrice(service: ServiceWithPrice): Promise<GetServicePriceResult> {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const promos = await prisma.marketing_posts.findMany({
    where: {
      practitioner_id: service.practitioner_id,
      discount_percentage: { not: null },
      start_date: { lte: dayEnd },
      end_date: { gte: dayStart },
      OR: [{ service_id: null }, { service_id: service.id }],
    },
    orderBy: { discount_percentage: "desc" },
    take: 1,
  });

  const bestPromo = promos[0];
  if (!bestPromo?.discount_percentage || bestPromo.discount_percentage <= 0) {
    return {
      priceCents: service.price_cents,
      originalPriceCents: service.price_cents,
      discountPercentage: null,
      hasPromo: false,
    };
  }

  const discount = Math.min(100, Math.max(0, bestPromo.discount_percentage));
  const discountedPrice = Math.round(service.price_cents * (1 - discount / 100));

  return {
    priceCents: Math.max(0, discountedPrice),
    originalPriceCents: service.price_cents,
    discountPercentage: discount,
    hasPromo: true,
  };
}
