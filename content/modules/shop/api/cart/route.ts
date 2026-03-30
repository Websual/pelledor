import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { cartItems, products } from "@/core/db/schema.modules";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function getSessionId(req: Request): string {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/session_token=([^;]+)/);
  if (match) return match[1].slice(0, 255);
  const uid = req.headers.get("x-cart-session");
  if (uid) return `anon-${uid}`.slice(0, 255);
  return "anon-default";
}

/** GET : contenu du panier (items + produits). */
export async function GET(req: Request) {
  const session = await auth();
  const sessionId = session?.user?.id ?? getSessionId(req);
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
  return NextResponse.json({ cart, subtotalCents });
}

/** POST : ajouter ou mettre à jour une ligne (body: productId, quantity). */
export async function POST(req: Request) {
  const session = await auth();
  const sessionId = session?.user?.id ?? getSessionId(req);
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
      return NextResponse.json({ ok: true, removed: true });
    }
    const [row] = await db
      .update(cartItems)
      .set({
        quantity,
        userId: session?.user?.id ?? null,
      })
      .where(eq(cartItems.id, existing.id))
      .returning();
    return NextResponse.json({ item: row });
  }
  if (quantity === 0)
    return NextResponse.json({ ok: true });
  const [row] = await db
    .insert(cartItems)
    .values({
      sessionId: sessionId.slice(0, 255),
      userId: session?.user?.id ?? null,
      productId,
      quantity,
    })
    .returning();
  return NextResponse.json({ item: row });
}
