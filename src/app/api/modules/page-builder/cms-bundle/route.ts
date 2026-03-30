import {
  normalizeBlocksToDocument,
  PageDocumentValidationError,
} from "@/core/builder/page-document";
import { getDb } from "@/core/db/server";
import { pageBlocks } from "@/core/db/schema.modules";
import {
  canSaveGlobalTheme,
  requirePractitionerForCmsApi,
} from "@/core/security/agent-bearer";
import { getThemeTokensResolved, saveThemeTokensPayload } from "@/core/theme/db";
import type { ThemeTokens } from "@/core/theme/types";
import { mergeThemeTokens } from "@/core/theme/types";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET — Export agent-ready : thème résolu + pages du praticien (documents normalisés v1).
 * POST — Import des pages (même auth que le builder) ; fusion thème réservée aux admins.
 */

export async function GET(req: Request) {
  const authz = await requirePractitionerForCmsApi(req);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const db = getDb();
  const p = authz.practitioner;

  const pages = await db.select().from(pageBlocks).where(eq(pageBlocks.practitionerId, p.id));
  const theme = await getThemeTokensResolved();

  return NextResponse.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    theme,
    pages: pages.map((row) => ({
      pageSlug: row.pageSlug,
      publishedAt: row.publishedAt,
      document: normalizeBlocksToDocument(row.blocks),
    })),
  });
}

type BundlePageIn = {
  pageSlug?: string;
  document?: unknown;
  blocks?: unknown;
  publish?: boolean;
};

export async function POST(req: Request) {
  const authz = await requirePractitionerForCmsApi(req);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    pages?: BundlePageIn[];
    theme?: Partial<ThemeTokens> | Record<string, unknown>;
  };

  const db = getDb();
  const p = authz.practitioner;

  if (body.theme && canSaveGlobalTheme(authz)) {
    const merged = mergeThemeTokens(body.theme);
    await saveThemeTokensPayload(merged);
  }

  if (!body.pages) {
    return NextResponse.json({ ok: true, importedPages: 0 });
  }

  if (!Array.isArray(body.pages)) {
    return NextResponse.json({ error: "pages doit être un tableau" }, { status: 400 });
  }

  let imported = 0;
  for (const item of body.pages) {
    const pageSlug = String(item.pageSlug ?? "home").trim().slice(0, 128);
    let document;
    try {
      document = normalizeBlocksToDocument(item.document ?? item.blocks ?? []);
    } catch (e) {
      if (e instanceof PageDocumentValidationError) {
        return NextResponse.json(
          { error: `${pageSlug}: ${e.message}` },
          { status: 400 }
        );
      }
      throw e;
    }

    const existing = await db.query.pageBlocks.findFirst({
      where: and(eq(pageBlocks.practitionerId, p.id), eq(pageBlocks.pageSlug, pageSlug)),
    });

    const publish = item.publish === true;
    const values = {
      practitionerId: p.id,
      pageSlug,
      blocks: document as unknown as Record<string, unknown>,
      publishedAt: publish
        ? new Date()
        : (existing?.publishedAt ?? null),
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(pageBlocks).set(values).where(eq(pageBlocks.id, existing.id));
    } else {
      await db.insert(pageBlocks).values(values);
    }
    imported += 1;
  }

  return NextResponse.json({ ok: true, importedPages: imported });
}
