import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { products } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET : un produit par slug (public si publié). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug));
  if (!row)
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  const session = await auth();
  if (!row.published && !session?.user)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  return NextResponse.json({ product: row });
}
