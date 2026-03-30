import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/core/db/server";
import { practitioners, siteNavItems } from "@/core/db/schema.modules";
import { JsonLdOrganization } from "@/core/seo/json-ld";
import { absoluteSiteUrl, getMetadataBase } from "@/core/seo/public-url";
import { asc, eq } from "drizzle-orm";
import { SiteNav } from "./site-nav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ establishment: string }>;
}): Promise<Metadata> {
  const { establishment } = await params;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) return { title: "Site" };
  const titleBase = p.title?.trim() || establishment;
  return {
    title: { default: titleBase, template: `%s · ${titleBase}` },
    metadataBase: getMetadataBase(),
    openGraph: {
      title: titleBase,
      url: absoluteSiteUrl(establishment, "home"),
    },
  };
}

export default async function SiteEstablishmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ establishment: string }>;
}) {
  const { establishment } = await params;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) notFound();

  const navRows = await db
    .select({
      id: siteNavItems.id,
      label: siteNavItems.label,
      linkType: siteNavItems.linkType,
      linkTarget: siteNavItems.linkTarget,
    })
    .from(siteNavItems)
    .where(eq(siteNavItems.practitionerId, p.id))
    .orderBy(asc(siteNavItems.sortOrder), asc(siteNavItems.createdAt));

  const orgUrl =
    p.publicSiteUrl?.trim() || absoluteSiteUrl(establishment, "home");
  const orgDesc = p.bio?.trim() || null;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <JsonLdOrganization name={p.title || establishment} url={orgUrl} description={orgDesc} />
      <SiteNav
        establishment={establishment}
        siteTitle={p.title}
        items={navRows}
      />
      {children}
    </div>
  );
}
