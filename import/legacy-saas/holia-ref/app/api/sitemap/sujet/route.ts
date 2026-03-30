import { NextRequest } from "next/server";

// Cache pour éviter de recalculer à chaque appel
let cachedData: {
  lastUpdated: number;
} | null = null;

const CACHE_DURATION = 1000 * 60 * 60; // 1 heure

function getCachedData() {
  const now = Date.now();

  if (!cachedData || (now - cachedData.lastUpdated) > CACHE_DURATION) {
    // Retourner des données vides pour éviter les imports JSON massifs
    cachedData = {
      lastUpdated: now
    };
  }

  return cachedData;
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  // Retourner un sitemap vide pour éviter les imports JSON massifs
  const subjects: any[] = [];
  const cities: any[] = [];

  const sitemapEntries: Array<{
    url: string;
    lastModified: string;
    changeFrequency: string;
    priority: number;
  }> = [];

  const today = new Date().toISOString();

  // Générer toutes les URLs sujet/[slug]/[ville]
  for (const subject of subjects) {
    for (const city of cities) {
      sitemapEntries.push({
        url: `${baseUrl}/sujet/${subject.slug}/${city.toLowerCase()}`,
        lastModified: today,
        changeFrequency: "weekly",
        priority: 0.8, // Plus élevé pour les sujets (plus convertisseurs)
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
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}