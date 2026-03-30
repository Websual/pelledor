import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { getDb } from "@/core/db/server";
import { cmsBlogCategories } from "@/core/db/schema.modules";
import { getPractitionerForApi } from "@/core/cms/practitioner";
import { slugify } from "@/core/cms/practitioner-utils";

export async function GET(req: Request) {
  const r = await getPractitionerForApi(req);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const { practitioner } = r;
  const db = getDb();
  const rows = await db
    .select()
    .from(cmsBlogCategories)
    .where(eq(cmsBlogCategories.practitionerId, practitioner!.id))
    .orderBy(asc(cmsBlogCategories.sortOrder), asc(cmsBlogCategories.name));
  return NextResponse.json({ categories: rows });
}

export async function POST(req: Request) {
  const r = await getPractitionerForApi(req);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const { practitioner } = r;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 255);
  if (!name) return NextResponse.json({ error: "name requis" }, { status: 400 });
  let slug = String(body.slug ?? "").trim();
  if (!slug) slug = slugify(name);
  else slug = slugify(slug);
  const sortOrder = Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0;

  const db = getDb();
  const [row] = await db
    .insert(cmsBlogCategories)
    .values({
      practitionerId: practitioner!.id,
      name,
      slug,
      sortOrder,
    })
    .returning();
  return NextResponse.json({ category: row });
}
