import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/core/db/server";
import { cmsBlogCategories, cmsBlogPosts } from "@/core/db/schema.modules";
import { getPractitionerForApi } from "@/core/cms/practitioner";
import { slugify } from "@/core/cms/practitioner-utils";
import { isPageDocumentV1 } from "@/core/builder/page-document";
import {
  seoPatchFromBody,
  type PageSeoColumns,
} from "@/core/seo/seo-fields";

type Params = { params: Promise<{ id: string }> };

function postSeoRow(row: typeof cmsBlogPosts.$inferSelect): PageSeoColumns {
  return {
    metaTitle: row.metaTitle ?? null,
    metaDescription: row.metaDescription ?? null,
    canonicalUrl: row.canonicalUrl ?? null,
    ogTitle: row.ogTitle ?? null,
    ogDescription: row.ogDescription ?? null,
    ogImageUrl: row.ogImageUrl ?? null,
    noindex: row.noindex,
    targetKeyword: row.targetKeyword ?? null,
  };
}

function parseBodyDocument(raw: unknown): unknown | null {
  if (raw === null || raw === undefined) return null;
  if (isPageDocumentV1(raw)) return raw;
  return null;
}

export async function GET(req: Request, { params }: Params) {
  const r = await getPractitionerForApi(req);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const { practitioner } = r;
  const { id } = await params;
  const db = getDb();
  const post = await db.query.cmsBlogPosts.findFirst({
    where: and(
      eq(cmsBlogPosts.id, id),
      eq(cmsBlogPosts.practitionerId, practitioner!.id)
    ),
  });
  if (!post) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: Request, { params }: Params) {
  const r = await getPractitionerForApi(req);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const { practitioner } = r;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const existing = await db.query.cmsBlogPosts.findFirst({
    where: and(
      eq(cmsBlogPosts.id, id),
      eq(cmsBlogPosts.practitionerId, practitioner!.id)
    ),
  });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const title =
    body.title !== undefined
      ? String(body.title).trim().slice(0, 512)
      : existing.title;
  if (!title) return NextResponse.json({ error: "title vide" }, { status: 400 });

  let slug = existing.slug;
  if (body.slug !== undefined) slug = slugify(String(body.slug));

  let categoryId: string | null = existing.categoryId;
  if (body.categoryId !== undefined) {
    if (body.categoryId === null || body.categoryId === "") {
      categoryId = null;
    } else {
      const cat = await db.query.cmsBlogCategories.findFirst({
        where: and(
          eq(cmsBlogCategories.id, String(body.categoryId)),
          eq(cmsBlogCategories.practitionerId, practitioner!.id)
        ),
      });
      if (!cat) return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
      categoryId = cat.id;
    }
  }

  const excerpt =
    body.excerpt !== undefined ? String(body.excerpt).slice(0, 4000) : existing.excerpt;
  const bodyHtml =
    body.bodyHtml !== undefined ? String(body.bodyHtml) : existing.bodyHtml;

  let bodyDocument: unknown | null = existing.bodyDocument;
  if (body.bodyDocument !== undefined) {
    bodyDocument = parseBodyDocument(body.bodyDocument);
    if (body.bodyDocument != null && bodyDocument === null) {
      return NextResponse.json({ error: "bodyDocument invalide" }, { status: 400 });
    }
  }

  const coverImageUrl =
    body.coverImageUrl !== undefined
      ? body.coverImageUrl
        ? String(body.coverImageUrl).slice(0, 2048)
        : null
      : existing.coverImageUrl;

  let publishedAt = existing.publishedAt;
  if (body.publish === true && !existing.publishedAt) publishedAt = new Date();
  if (body.publish === false) publishedAt = null;

  const seoPart = seoPatchFromBody(body as Record<string, unknown>, postSeoRow(existing));

  const [row] = await db
    .update(cmsBlogPosts)
    .set({
      slug,
      title,
      categoryId,
      excerpt,
      bodyHtml,
      bodyDocument: bodyDocument as Record<string, unknown> | null,
      coverImageUrl,
      publishedAt,
      ...seoPart,
    })
    .where(eq(cmsBlogPosts.id, id))
    .returning();
  return NextResponse.json({ post: row });
}

export async function DELETE(req: Request, { params }: Params) {
  const r = await getPractitionerForApi(req);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const { practitioner } = r;
  const { id } = await params;
  const db = getDb();
  const deleted = await db
    .delete(cmsBlogPosts)
    .where(
      and(eq(cmsBlogPosts.id, id), eq(cmsBlogPosts.practitionerId, practitioner!.id))
    )
    .returning({ id: cmsBlogPosts.id });
  if (!deleted.length) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
