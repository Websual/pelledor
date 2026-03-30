import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageDocumentRenderer } from "@/core/builder/BlockRenderer";
import { getDb } from "@/core/db/server";
import { pageBlocks, practitioners } from "@/core/db/schema.modules";
import { metadataForBuilderPage } from "@/core/seo/build-metadata";
import { and, eq } from "drizzle-orm";

/**
 * Page publique construite avec le page builder.
 * URL : /saas-os/site/{slug-établissement}/{slug-page} (ex. home, contact)
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ establishment: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { establishment, pageSlug } = await params;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) return {};
  const page = await db.query.pageBlocks.findFirst({
    where: and(eq(pageBlocks.practitionerId, p.id), eq(pageBlocks.pageSlug, pageSlug)),
  });
  if (!page?.publishedAt) return { title: pageSlug };
  return metadataForBuilderPage(
    {
      pageSlug: page.pageSlug,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      canonicalUrl: page.canonicalUrl,
      ogTitle: page.ogTitle,
      ogDescription: page.ogDescription,
      ogImageUrl: page.ogImageUrl,
      noindex: page.noindex,
    },
    p.title || establishment,
    establishment
  );
}

export default async function SiteBuilderPublicPage({
  params,
}: {
  params: Promise<{ establishment: string; pageSlug: string }>;
}) {
  const { establishment, pageSlug } = await params;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) notFound();

  const page = await db.query.pageBlocks.findFirst({
    where: and(eq(pageBlocks.practitionerId, p.id), eq(pageBlocks.pageSlug, pageSlug)),
  });
  if (!page?.publishedAt) notFound();

  return (
    <main>
      <PageDocumentRenderer payload={page.blocks} />
    </main>
  );
}
