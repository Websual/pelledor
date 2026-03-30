import {
  normalizeBlocksToDocument,
  PageDocumentValidationError,
} from "@/core/builder/page-document";
import { getDb } from "@/core/db/server";
import { pageBlocks, practitioners } from "@/core/db/schema.modules";
import { mergePageBlockSeo } from "@/core/seo/seo-fields";
import { requirePractitionerForCmsApi } from "@/core/security/agent-bearer";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/modules/page-builder/pages?slug=home  (public — retourne la page publiée)
// GET /api/modules/page-builder/pages            (auth — retourne toutes les pages du praticien)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const establishment = searchParams.get("e");
  const db = getDb();

  // Public : lecture d'une page publiée via establishment slug
  if (establishment && slug) {
    const p = await db.query.practitioners.findFirst({ where: eq(practitioners.slug, establishment) });
    if (!p) return NextResponse.json({ page: null });
    const page = await db.query.pageBlocks.findFirst({
      where: and(eq(pageBlocks.practitionerId, p.id), eq(pageBlocks.pageSlug, slug)),
    });
    if (!page || !page.publishedAt) return NextResponse.json({ page: null });
    return NextResponse.json({ page });
  }

  // Auth : liste des pages du praticien connecté (session ou Bearer agent)
  const authz = await requirePractitionerForCmsApi(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });
  const pages = await db
    .select()
    .from(pageBlocks)
    .where(eq(pageBlocks.practitionerId, authz.practitioner.id));
  return NextResponse.json({ pages });
}

// POST /api/modules/page-builder/pages  — créer ou mettre à jour une page
export async function POST(req: Request) {
  const authz = await requirePractitionerForCmsApi(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });
  const body = await req.json().catch(() => ({}));
  const pageSlug = String(body.pageSlug ?? "home").trim().slice(0, 128);
  const publish = body.publish === true;
  const rawPayload = body.blocks ?? body.document;
  let document;
  try {
    document = normalizeBlocksToDocument(
      rawPayload === undefined ? [] : rawPayload
    );
  } catch (e) {
    if (e instanceof PageDocumentValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const db = getDb();
  const p = authz.practitioner;

  const existing = await db.query.pageBlocks.findFirst({
    where: and(eq(pageBlocks.practitionerId, p.id), eq(pageBlocks.pageSlug, pageSlug)),
  });

  const seo = mergePageBlockSeo(body as Record<string, unknown>, existing ?? undefined);
  const values = {
    practitionerId: p.id,
    pageSlug,
    blocks: document as unknown as Record<string, unknown>,
    publishedAt: publish ? new Date() : (existing?.publishedAt ?? null),
    updatedAt: new Date(),
    ...seo,
  };

  if (existing) {
    await db.update(pageBlocks).set(values).where(eq(pageBlocks.id, existing.id));
    return NextResponse.json({ ok: true, id: existing.id });
  }
  const [row] = await db.insert(pageBlocks).values(values).returning();
  return NextResponse.json({ ok: true, id: row.id });
}
