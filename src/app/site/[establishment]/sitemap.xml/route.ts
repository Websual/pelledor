import { getDb } from "@/core/db/server";
import {
  cmsBlogPosts,
  cmsPortfolioProjects,
  pageBlocks,
  practitioners,
} from "@/core/db/schema.modules";
import { absoluteSiteUrl } from "@/core/seo/public-url";
import { and, eq, isNotNull } from "drizzle-orm";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ establishment: string }> }
) {
  const { establishment } = await context.params;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) {
    return new Response("Not found", { status: 404 });
  }

  const urls: { loc: string; lastmod?: string }[] = [];

  const pages = await db
    .select({
      pageSlug: pageBlocks.pageSlug,
      updatedAt: pageBlocks.updatedAt,
    })
    .from(pageBlocks)
    .where(
      and(
        eq(pageBlocks.practitionerId, p.id),
        isNotNull(pageBlocks.publishedAt)
      )
    );

  for (const row of pages) {
    urls.push({
      loc: absoluteSiteUrl(establishment, row.pageSlug),
      lastmod: row.updatedAt?.toISOString(),
    });
  }

  urls.push({ loc: absoluteSiteUrl(establishment, "blog") });
  urls.push({ loc: absoluteSiteUrl(establishment, "portfolio") });

  const posts = await db
    .select({
      slug: cmsBlogPosts.slug,
      updatedAt: cmsBlogPosts.updatedAt,
    })
    .from(cmsBlogPosts)
    .where(
      and(
        eq(cmsBlogPosts.practitionerId, p.id),
        isNotNull(cmsBlogPosts.publishedAt)
      )
    );

  for (const row of posts) {
    urls.push({
      loc: absoluteSiteUrl(establishment, "blog", row.slug),
      lastmod: row.updatedAt?.toISOString(),
    });
  }

  const projects = await db
    .select({
      slug: cmsPortfolioProjects.slug,
      updatedAt: cmsPortfolioProjects.updatedAt,
    })
    .from(cmsPortfolioProjects)
    .where(
      and(
        eq(cmsPortfolioProjects.practitionerId, p.id),
        isNotNull(cmsPortfolioProjects.publishedAt)
      )
    );

  for (const row of projects) {
    urls.push({
      loc: absoluteSiteUrl(establishment, "portfolio", row.slug),
      lastmod: row.updatedAt?.toISOString(),
    });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const lm = u.lastmod ? `\n  <lastmod>${xmlEscape(u.lastmod)}</lastmod>` : "";
    return `  <url>
    <loc>${xmlEscape(u.loc)}</loc>${lm}
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
