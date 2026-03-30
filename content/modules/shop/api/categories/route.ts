import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { productCategories } from "@/core/db/schema.modules";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET : liste des catégories (public). */
export async function GET() {
  const db = getDb();
  const list = await db
    .select()
    .from(productCategories)
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.name));
  return NextResponse.json({ categories: list });
}

/** POST : créer une catégorie (admin). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    .insert(productCategories)
    .values({
      name: name.slice(0, 255),
      slug,
      description: body.description ? String(body.description).slice(0, 2000) : null,
      sortOrder: parseInt(body.sortOrder, 10) || 0,
    })
    .returning();
  return NextResponse.json({ category: row });
}
