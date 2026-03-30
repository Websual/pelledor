import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { products } from "@/core/db/schema.modules";
import { requireShopAdmin } from "@/core/shop/admin";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET : liste publiée (public) ou catalogue complet (admin uniquement). */
export async function GET() {
  const db = getDb();
  const session = await auth();
  if (session?.user?.role === "admin") {
    const list = await db.select().from(products).orderBy(products.createdAt);
    return NextResponse.json({ products: list });
  }
  const list = await db
    .select()
    .from(products)
    .where(eq(products.published, true))
    .orderBy(products.createdAt);
  return NextResponse.json({ products: list });
}

/** POST : créer un produit (admin). */
export async function POST(req: Request) {
  const session = await auth();
  const denied = requireShopAdmin(session);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 160);
  if (!name || !slug)
    return NextResponse.json(
      { error: "name et slug requis" },
      { status: 400 }
    );
  const db = getDb();
  const [row] = await db
    .insert(products)
    .values({
      name: name.slice(0, 512),
      slug,
      description: body.description ? String(body.description).slice(0, 10000) : null,
      priceCents: Math.max(0, parseInt(body.priceCents, 10) || 0),
      imageUrl: body.imageUrl ? String(body.imageUrl).slice(0, 2048) : null,
      stock: body.stock != null ? parseInt(body.stock, 10) || null : null,
      published: Boolean(body.published),
      weightG: body.weightG != null ? parseInt(body.weightG, 10) || null : null,
    })
    .returning();
  return NextResponse.json({ product: row });
}
