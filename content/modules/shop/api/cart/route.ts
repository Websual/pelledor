import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { cartItems, products } from "@/core/db/schema.modules";
import { applyCartCookie, resolveCartSessionId } from "@/core/shop/cart-session";
import { rateLimitByIp } from "@/core/security/rate-limit-request";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET : contenu du panier (items + produits). */
export async function GET() {
  const session = await auth();
  const { sessionId, setCookie } = await resolveCartSessionId(session?.user?.id);
  const db = getDb();
  const items = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      name: products.name,
      slug: products.slug,
      priceCents: products.priceCents,
      imageUrl: products.imageUrl,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.sessionId, sessionId));
  const cart = items.map((i) => ({
    id: i.id,
    productId: i.productId,
    quantity: i.quantity,
    name: i.name,
    slug: i.slug,
    priceCents: i.priceCents,
    imageUrl: i.imageUrl,
    totalCents: i.quantity * i.priceCents,
  }));
  const subtotalCents = cart.reduce((s, i) => s + i.totalCents, 0);
  const res = NextResponse.json({ cart, subtotalCents });
  if (setCookie) applyCartCookie(res, setCookie);
  return res;
}

/** POST : ajouter ou mettre à jour une ligne (body: productId, quantity). */
export async function POST(req: Request) {
  if (!(await rateLimitByIp("shop-cart-mutate", 90, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Trop de modifications du panier. Réessayez plus tard." },
      { status: 429 }
    );
  }
  const session = await auth();
  const { sessionId, setCookie } = await resolveCartSessionId(session?.user?.id);
  const body = await req.json().catch(() => ({}));
  const productId = body.productId;
  const quantity = Math.max(0, parseInt(body.quantity, 10) || 1);
  if (!productId)
    return NextResponse.json(
      { error: "productId requis" },
      { status: 400 }
    );
  const db = getDb();
  const [existing] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.sessionId, sessionId),
        eq(cartItems.productId, productId)
      )
    );
  if (existing) {
    if (quantity === 0) {
      await db.delete(cartItems).where(eq(cartItems.id, existing.id));
      const res = NextResponse.json({ ok: true, removed: true });
      if (setCookie) applyCartCookie(res, setCookie);
      return res;
    }
    const [row] = await db
      .update(cartItems)
      .set({
        quantity,
        userId: session?.user?.id ?? null,
      })
      .where(eq(cartItems.id, existing.id))
      .returning();
    const res = NextResponse.json({ item: row });
    if (setCookie) applyCartCookie(res, setCookie);
    return res;
  }
  if (quantity === 0) {
    const res = NextResponse.json({ ok: true });
    if (setCookie) applyCartCookie(res, setCookie);
    return res;
  }
  const [row] = await db
    .insert(cartItems)
    .values({
      sessionId: sessionId.slice(0, 255),
      userId: session?.user?.id ?? null,
      productId,
      quantity,
    })
    .returning();
  const res = NextResponse.json({ item: row });
  if (setCookie) applyCartCookie(res, setCookie);
  return res;
}
