import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Sitemap des URLs remboursement pour le silo PSEO :
 * - /remboursement/[profession] : pages profession (mutuelles qui remboursent)
 * - /remboursement/[mutuelle] : pages Hub mutuelle (professions remboursées)
 * - /remboursement/[mutuelle]/[profession] : pages Sniper (SEO long-tail)
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

  const today = new Date().toISOString();

  const [
    professionsWithMutuelles,
    mutuellesWithProfessions,
    professionMutuelles,
  ] = await Promise.all([
    prisma.professions.findMany({
      where: { profession_mutuelles: { some: {} } },
      select: { slug: true },
    }),
    prisma.mutuelles.findMany({
      where: { profession_mutuelles: { some: {} } },
      select: { slug: true },
    }),
    prisma.profession_mutuelles.findMany({
      include: {
        mutuelle: { select: { slug: true } },
        profession: { select: { slug: true } },
      },
    }),
  ]);

  const entries: Array<{
    url: string;
    lastModified: string;
    changeFrequency: "monthly" | "weekly";
    priority: number;
  }> = [];

  // 1. Pages profession : /remboursement/[profession]
  for (const p of professionsWithMutuelles) {
    entries.push({
      url: `${baseUrl}/remboursement/${p.slug}`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // 2. Pages Hub mutuelle : /remboursement/[mutuelle]
  for (const m of mutuellesWithProfessions) {
    entries.push({
      url: `${baseUrl}/remboursement/${m.slug}`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.85,
    });
  }

  // 3. Pages Sniper : /remboursement/[mutuelle]/[profession]
  for (const pm of professionMutuelles) {
    entries.push({
      url: `${baseUrl}/remboursement/${pm.mutuelle.slug}/${pm.profession.slug}`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.9,
    });
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
