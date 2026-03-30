import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/core/db/server";
import { cmsBlogCategories } from "@/core/db/schema.modules";
import { getPractitionerForSession } from "@/core/cms/practitioner";
import { slugify } from "@/core/cms/practitioner-utils";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { practitioner, error } = await getPractitionerForSession();
  if (error) {
    return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 404 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const existing = await db.query.cmsBlogCategories.findFirst({
    where: and(
      eq(cmsBlogCategories.id, id),
      eq(cmsBlogCategories.practitionerId, practitioner!.id)
    ),
  });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const name =
    body.name !== undefined ? String(body.name).trim().slice(0, 255) : existing.name;
  const slug =
    body.slug !== undefined
      ? slugify(String(body.slug))
      : existing.slug;
  const sortOrder =
    body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder;

  const [row] = await db
    .update(cmsBlogCategories)
    .set({ name, slug, sortOrder })
    .where(eq(cmsBlogCategories.id, id))
    .returning();
  return NextResponse.json({ category: row });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { practitioner, error } = await getPractitionerForSession();
  if (error) {
    return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 404 });
  }
  const { id } = await params;
  const db = getDb();
  const deleted = await db
    .delete(cmsBlogCategories)
    .where(
      and(
        eq(cmsBlogCategories.id, id),
        eq(cmsBlogCategories.practitionerId, practitioner!.id)
      )
    )
    .returning({ id: cmsBlogCategories.id });
  if (!deleted.length) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
