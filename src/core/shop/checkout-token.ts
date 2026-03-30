import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const s =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (!s) throw new Error("AUTH_SECRET manquant");
  return s;
}

/**
 * Jeton opaque pour permettre le checkout Stripe aux invités (sans session compte).
 * Lié à orderId + email + montants figés en base.
 */
export function signShopCheckoutToken(payload: {
  orderId: string;
  email: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}): string {
  const secret = getSecret();
  const raw = [
    payload.orderId,
    payload.email.toLowerCase().trim(),
    String(payload.subtotalCents),
    String(payload.shippingCents),
    String(payload.totalCents),
  ].join("|");
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export function verifyShopCheckoutToken(
  payload: {
    orderId: string;
    email: string;
    subtotalCents: number;
    shippingCents: number;
    totalCents: number;
  },
  token: string
): boolean {
  try {
    const expected = signShopCheckoutToken(payload);
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(token.trim(), "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
