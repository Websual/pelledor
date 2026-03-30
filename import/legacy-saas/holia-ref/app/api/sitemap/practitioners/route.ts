import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Cache pour éviter de recalculer à chaque appel
let cachedData: {
  practitioners: Array<{ slug: string; updated_at: Date }>;
  lastUpdated: number;
} | null = null;

const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes (plus court pour les praticiens)

async function getCachedData() {
  const now = Date.now();

  if (!cachedData || (now - cachedData.lastUpdated) > CACHE_DURATION) {
    try {
      let practitioners = await prisma.practitioners.findMany({
        where: {
          is_active: true
        },
        select: {
          slug: true,
          updated_at: true
        },
        orderBy: {
          updated_at: 'desc'
        }
      });

      // Filtrer les slugs null après la requête
      practitioners = practitioners.filter(p => p.slug);

      cachedData = {
        practitioners,
        lastUpdated: now
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des praticiens:', error);
      // Retourner un cache vide en cas d'erreur
      cachedData = {
        practitioners: [],
        lastUpdated: now
      };
    }
  }

  return cachedData;
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  const { practitioners } = await getCachedData();

  const sitemapEntries: Array<{
    url: string;
    lastModified: string;
    changeFrequency: string;
    priority: number;
  }> = [];

  // Générer les URLs pour les praticiens /praticien/[slug]
  for (const practitioner of practitioners) {
    if (practitioner.slug) {
      sitemapEntries.push({
        url: `${baseUrl}/praticien/${practitioner.slug}`,
        lastModified: practitioner.updated_at.toISOString(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  // Générer le XML du sitemap
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800', // 30 minutes
    },
  });
}