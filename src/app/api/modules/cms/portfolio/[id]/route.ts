import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/core/db/server";
import { cmsPortfolioProjects } from "@/core/db/schema.modules";
import { getPractitionerForSession } from "@/core/cms/practitioner";
import { slugify } from "@/core/cms/practitioner-utils";
import { isPageDocumentV1 } from "@/core/builder/page-document";
import {
  seoPatchFromBody,
  type PageSeoColumns,
} from "@/core/seo/seo-fields";

type Params = { params: Promise<{ id: string }> };

function projectSeoRow(row: typeof cmsPortfolioProjects.$inferSelect): PageSeoColumns {
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

function parseDescriptionDoc(raw: unknown): unknown | null {
  if (raw === null || raw === undefined) return null;
  if (isPageDocumentV1(raw)) return raw;
  return null;
}

function parseGallery(raw: unknown): { src: string; alt?: string }[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return [];
  const out: { src: string; alt?: string }[] = [];
  for (const x of raw.slice(0, 80)) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.src !== "string" || !o.src) continue;
    out.push({
      src: o.src.slice(0, 2048),
      alt: typeof o.alt === "string" ? o.alt.slice(0, 500) : undefined,
    });
  }
  return out;
}

export async function GET(_req: Request, { params }: Params) {
  const { practitioner, error } = await getPractitionerForSession();
  if (error) {
    return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 404 });
  }
  const { id } = await params;
  const db = getDb();
  const project = await db.query.cmsPortfolioProjects.findFirst({
    where: and(
      eq(cmsPortfolioProjects.id, id),
      eq(cmsPortfolioProjects.practitionerId, practitioner!.id)
    ),
  });
  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(req: Request, { params }: Params) {
  const { practitioner, error } = await getPractitionerForSession();
  if (error) {
    return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 404 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const existing = await db.query.cmsPortfolioProjects.findFirst({
    where: and(
      eq(cmsPortfolioProjects.id, id),
      eq(cmsPortfolioProjects.practitionerId, practitioner!.id)
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

  const summary =
    body.summary !== undefined ? String(body.summary).slice(0, 4000) : existing.summary;
  const descriptionHtml =
    body.descriptionHtml !== undefined
      ? String(body.descriptionHtml)
      : existing.descriptionHtml;

  let descriptionDocument: unknown | null = existing.descriptionDocument;
  if (body.descriptionDocument !== undefined) {
    descriptionDocument = parseDescriptionDoc(body.descriptionDocument);
    if (body.descriptionDocument != null && descriptionDocument === null) {
      return NextResponse.json({ error: "descriptionDocument invalide" }, { status: 400 });
    }
  }

  const gallery =
    body.gallery !== undefined ? parseGallery(body.gallery) : undefined;
  const clientName =
    body.clientName !== undefined
      ? String(body.clientName).slice(0, 255)
      : existing.clientName;
  const roleLabel =
    body.roleLabel !== undefined
      ? String(body.roleLabel).slice(0, 255)
      : existing.roleLabel;
  const coverImageUrl =
    body.coverImageUrl !== undefined
      ? body.coverImageUrl
        ? String(body.coverImageUrl).slice(0, 2048)
        : null
      : existing.coverImageUrl;
  const externalUrl =
    body.externalUrl !== undefined
      ? body.externalUrl
        ? String(body.externalUrl).slice(0, 2048)
        : null
      : existing.externalUrl;
  const sortOrder =
    body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder;

  let publishedAt = existing.publishedAt;
  if (body.publish === true && !existing.publishedAt) publishedAt = new Date();
  if (body.publish === false) publishedAt = null;

  const seoPart = seoPatchFromBody(
    body as Record<string, unknown>,
    projectSeoRow(existing)
  );

  const [row] = await db
    .update(cmsPortfolioProjects)
    .set({
      slug,
      title,
      summary,
      descriptionHtml,
      descriptionDocument: descriptionDocument as Record<string, unknown> | null,
      clientName,
      roleLabel,
      coverImageUrl,
      externalUrl,
      sortOrder,
      publishedAt,
      ...seoPart,
      ...(gallery !== undefined ? { gallery } : {}),
    })
    .where(eq(cmsPortfolioProjects.id, id))
    .returning();
  return NextResponse.json({ project: row });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { practitioner, error } = await getPractitionerForSession();
  if (error) {
    return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 404 });
  }
  const { id } = await params;
  const db = getDb();
  const deleted = await db
    .delete(cmsPortfolioProjects)
    .where(
      and(
        eq(cmsPortfolioProjects.id, id),
        eq(cmsPortfolioProjects.practitionerId, practitioner!.id)
      )
    )
    .returning({ id: cmsPortfolioProjects.id });
  if (!deleted.length) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
