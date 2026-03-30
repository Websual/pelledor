import { headers } from "next/headers";
import { rateLimitMemory } from "./rate-limit-memory";

/**
 * Rate limit par IP (X-Forwarded-For / X-Real-IP). Instance unique — voir rate-limit-memory.
 */
export async function rateLimitByIp(
  keyPrefix: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip")?.trim() ??
    "unknown";
  return rateLimitMemory(`${keyPrefix}:${ip}`, max, windowMs);
}
