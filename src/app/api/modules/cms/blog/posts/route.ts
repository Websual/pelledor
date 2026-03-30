import { NextResponse } from "next/server";
import { desc, eq, and, isNotNull } from "drizzle-orm";
import { getDb } from "@/core/db/server";
import { cmsBlogCategories, cmsBlogPosts } from "@/core/db/schema.modules";
import { getPractitionerForApi } from "@/core/cms/practitioner";
import { slugify } from "@/core/cms/practitioner-utils";
import { isPageDocumentV1 } from "@/core/builder/page-document";
import { seoFromBodyForInsert } from "@/core/seo/seo-fields";

function parseBodyDocument(raw: unknown): unknown | null {
  if (raw === null || raw === undefined) return null;
  if (isPageDocumentV1(raw)) return raw;
  return null;
}

export async function GET(req: Request) {
  const r = await getPractitionerForApi(req);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const { practitioner } = r;
  const db = getDb();
  const posts = await db
    .select()
    .from(cmsBlogPosts)
    .where(eq(cmsBlogPosts.practitionerId, practitioner!.id))
    .orderBy(desc(cmsBlogPosts.updatedAt));
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const r = await getPractitionerForApi(req);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const { practitioner } = r;
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim().slice(0, 512);
  if (!title) return NextResponse.json({ error: "title requis" }, { status: 400 });
  let slug = String(body.slug ?? "").trim();
  if (!slug) slug = slugify(title);
  else slug = slugify(slug);

  const excerpt = String(body.excerpt ?? "").slice(0, 4000);
  const bodyHtml = String(body.bodyHtml ?? "");
  const bodyDocument = parseBodyDocument(body.bodyDocument);
  if (body.bodyDocument != null && bodyDocument === null) {
    return NextResponse.json({ error: "bodyDocument invalide (attendu PageDocumentV1)" }, { status: 400 });
  }
  const coverImageUrl = body.coverImageUrl
    ? String(body.coverImageUrl).slice(0, 2048)
    : null;
  const publish = body.publish === true;
  let categoryId: string | null = null;
  if (body.categoryId) {
    const db = getDb();
    const cat = await db.query.cmsBlogCategories.findFirst({
      where: and(
        eq(cmsBlogCategories.id, String(body.categoryId)),
        eq(cmsBlogCategories.practitionerId, practitioner!.id)
      ),
    });
    if (!cat) return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    categoryId = cat.id;
  }

  const db = getDb();
  const [row] = await db
    .insert(cmsBlogPosts)
    .values({
      practitionerId: practitioner!.id,
      categoryId,
      slug,
      title,
      excerpt,
      bodyHtml,
      bodyDocument: bodyDocument as Record<string, unknown> | null,
      coverImageUrl,
      publishedAt: publish ? new Date() : null,
      ...seoFromBodyForInsert(body as Record<string, unknown>),
    })
    .returning();
  return NextResponse.json({ post: row });
}
