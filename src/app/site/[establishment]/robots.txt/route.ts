import { getDb } from "@/core/db/server";
import { practitioners } from "@/core/db/schema.modules";
import { APP_BASE_PATH } from "@/core/seo/constants";
import { absoluteSiteUrl, getPublicOrigin } from "@/core/seo/public-url";
import { eq } from "drizzle-orm";

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

  const custom = p.seoRobotsTxt?.trim();
  if (custom) {
    return new Response(custom, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const origin = getPublicOrigin() || "http://localhost:3000";
  const sitemapUrl = absoluteSiteUrl(establishment, "sitemap.xml");
  const body = `User-agent: *
Allow: ${APP_BASE_PATH}/site/${establishment}/

Host: ${origin.replace(/^https?:\/\//, "")}

Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
