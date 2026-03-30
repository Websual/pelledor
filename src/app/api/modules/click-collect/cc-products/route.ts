import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { ccProducts, practitioners } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("e");
  const db = getDb();
  if (slug) {
    const p = await db.query.practitioners.findFirst({ where: eq(practitioners.slug, slug) });
    if (!p) return NextResponse.json({ products: [] });
    const products = await db
      .select()
      .from(ccProducts)
      .where(eq(ccProducts.restaurantId, p.id));
    return NextResponse.json({ products: products.filter((x) => x.available) });
  }
  // Auth: list all for connected restaurant
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!p) return NextResponse.json({ products: [] });
  const products = await db.select().from(ccProducts).where(eq(ccProducts.restaurantId, p.id));
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const priceCents = parseInt(body.priceCents ?? body.price_cents ?? 0);
  if (!name || !priceCents)
    return NextResponse.json({ error: "Nom et prix requis" }, { status: 400 });
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!p) return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  const [product] = await db
    .insert(ccProducts)
    .values({
      restaurantId: p.id,
      name: name.slice(0, 512),
      description: body.description ? String(body.description).slice(0, 2000) : null,
      priceCents,
      available: body.available !== false,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();
  return NextResponse.json({ ok: true, product });
}
