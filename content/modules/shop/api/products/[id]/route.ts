import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { products } from "@/core/db/schema.modules";
import { requireShopAdmin } from "@/core/shop/admin";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET : un produit par id (public si publié, sinon admin uniquement). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const [row] = await db.select().from(products).where(eq(products.id, id));
  if (!row)
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  const session = await auth();
  if (!row.published && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  return NextResponse.json({ product: row });
}

/** PATCH : modifier un produit (admin). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const denied = requireShopAdmin(session);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = String(body.name).slice(0, 512);
  if (body.slug !== undefined)
    updates.slug = String(body.slug)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 160);
  if (body.description !== undefined)
    updates.description = body.description ? String(body.description).slice(0, 10000) : null;
  if (body.priceCents !== undefined)
    updates.priceCents = Math.max(0, parseInt(body.priceCents, 10) || 0);
  if (body.imageUrl !== undefined)
    updates.imageUrl = body.imageUrl ? String(body.imageUrl).slice(0, 2048) : null;
  if (body.stock !== undefined)
    updates.stock = body.stock != null ? parseInt(body.stock, 10) || null : null;
  if (body.published !== undefined) updates.published = Boolean(body.published);
  if (body.weightG !== undefined)
    updates.weightG = body.weightG != null ? parseInt(body.weightG, 10) || null : null;
  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  const [row] = await db
    .update(products)
    .set(updates as Record<string, string | number | boolean | null>)
    .where(eq(products.id, id))
    .returning();
  if (!row)
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  return NextResponse.json({ product: row });
}

/** DELETE : supprimer un produit (admin). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const denied = requireShopAdmin(session);
  if (denied) return denied;
  const { id } = await params;
  const db = getDb();
  await db.delete(products).where(eq(products.id, id));
  return NextResponse.json({ ok: true });
}
