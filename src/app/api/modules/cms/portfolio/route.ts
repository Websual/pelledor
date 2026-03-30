import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/core/db/server";
import { cmsPortfolioProjects } from "@/core/db/schema.modules";
import { getPractitionerForSession } from "@/core/cms/practitioner";
import { slugify } from "@/core/cms/practitioner-utils";
import { isPageDocumentV1 } from "@/core/builder/page-document";
import { seoFromBodyForInsert } from "@/core/seo/seo-fields";

function parseDescriptionDoc(raw: unknown): unknown | null {
  if (raw === null || raw === undefined) return null;
  if (isPageDocumentV1(raw)) return raw;
  return null;
}

function parseGallery(raw: unknown): { src: string; alt?: string }[] {
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

export async function GET() {
  const { practitioner, error } = await getPractitionerForSession();
  if (error) {
    return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 404 });
  }
  const db = getDb();
  const projects = await db
    .select()
    .from(cmsPortfolioProjects)
    .where(eq(cmsPortfolioProjects.practitionerId, practitioner!.id))
    .orderBy(
      asc(cmsPortfolioProjects.sortOrder),
      desc(cmsPortfolioProjects.updatedAt)
    );
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const { practitioner, error } = await getPractitionerForSession();
  if (error) {
    return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 404 });
  }
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim().slice(0, 512);
  if (!title) return NextResponse.json({ error: "title requis" }, { status: 400 });
  let slug = String(body.slug ?? "").trim();
  if (!slug) slug = slugify(title);
  else slug = slugify(slug);

  const summary = String(body.summary ?? "").slice(0, 4000);
  const descriptionHtml = String(body.descriptionHtml ?? "");
  const descriptionDocument = parseDescriptionDoc(body.descriptionDocument);
  if (body.descriptionDocument != null && descriptionDocument === null) {
    return NextResponse.json(
      { error: "descriptionDocument invalide (PageDocumentV1 attendu)" },
      { status: 400 }
    );
  }
  const gallery = parseGallery(body.gallery);
  const clientName = String(body.clientName ?? "").slice(0, 255);
  const roleLabel = String(body.roleLabel ?? "").slice(0, 255);
  const coverImageUrl = body.coverImageUrl
    ? String(body.coverImageUrl).slice(0, 2048)
    : null;
  const externalUrl = body.externalUrl
    ? String(body.externalUrl).slice(0, 2048)
    : null;
  const sortOrder = Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0;
  const publish = body.publish === true;

  const db = getDb();
  const [row] = await db
    .insert(cmsPortfolioProjects)
    .values({
      practitionerId: practitioner!.id,
      slug,
      title,
      summary,
      descriptionHtml,
      descriptionDocument: descriptionDocument as Record<string, unknown> | null,
      coverImageUrl,
      gallery,
      clientName,
      roleLabel,
      externalUrl,
      sortOrder,
      publishedAt: publish ? new Date() : null,
      ...seoFromBodyForInsert(body as Record<string, unknown>),
    })
    .returning();
  return NextResponse.json({ project: row });
}
