import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export const PD_CART_COOKIE = "pd_cart_sid";

const GUEST_PREFIX = "guest_";
const TOKEN_HEX = 64;

function isGuestSessionId(s: string): boolean {
  return (
    s.startsWith(GUEST_PREFIX) &&
    s.length === GUEST_PREFIX.length + TOKEN_HEX &&
    /^guest_[a-f0-9]{64}$/.test(s)
  );
}

/**
 * Panier : utilisateur connecté = `userId` ; invité = cookie httpOnly aléatoire (jamais de fallback partagé).
 */
type CartCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
};

export async function resolveCartSessionId(
  userId: string | undefined
): Promise<{
  sessionId: string;
  setCookie?: { name: string; value: string; options: CartCookieOptions };
}> {
  if (userId) {
    return { sessionId: userId };
  }
  const store = await cookies();
  const existing = store.get(PD_CART_COOKIE)?.value;
  if (existing && isGuestSessionId(existing)) {
    return { sessionId: existing };
  }
  const value = `${GUEST_PREFIX}${randomBytes(32).toString("hex")}`;
  return {
    sessionId: value,
    setCookie: {
      name: PD_CART_COOKIE,
      value,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 400,
      },
    },
  };
}

export function applyCartCookie(
  res: import("next/server").NextResponse,
  setCookie: NonNullable<Awaited<ReturnType<typeof resolveCartSessionId>>["setCookie"]>
): void {
  res.cookies.set(setCookie.name, setCookie.value, setCookie.options);
}
