import { NextRequest, NextResponse } from "next/server";

const MAPBOX_TOKEN =
  process.env.MAPBOX_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** Pays francophones limitrophes (codes ISO) */
const FRANCOPHONE_COUNTRIES = ["FR", "BE", "CH", "LU", "MC"] as const;
const COUNTRY_LABELS: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  LU: "Luxembourg",
  MC: "Monaco",
};

interface CitySuggestion {
  label: string;
  displayLabel: string;
  coords: { lat: number; lng: number };
  postcode?: string;
  countryCode?: string;
}

function isInFrancophoneZone(lat: number, lng: number): boolean {
  return lat >= 43 && lat <= 52 && lng >= -5 && lng <= 11;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions: CitySuggestion[] = [];
  const seen = new Set<string>();

  // 1. Adresse Gouv (France)
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=8`
    );
    if (res.ok) {
      const data = await res.json();
      for (const f of data.features || []) {
        if (f.properties?.type !== "municipality" || !f.geometry?.coordinates) continue;
        const cityName = f.properties.city || f.properties.name || "";
        const [lng, lat] = f.geometry.coordinates;
        if (!cityName || !isInFrancophoneZone(lat, lng)) continue;
        const postcode = f.properties.postcode || "";
        const dept = postcode ? postcode.substring(0, 2) : "";
        const displayLabel = dept ? `${cityName} (${dept})` : cityName;
        const key = `${cityName}_${dept}_FR`;
        if (seen.has(key)) continue;
        seen.add(key);
        suggestions.push({ label: cityName, displayLabel, coords: { lat, lng }, postcode, countryCode: "FR" });
      }
    }
  } catch {
    // continuer avec Mapbox
  }

  // 2. Fallback Mapbox (monde, privilégie le français) si aucun résultat Adresse Gouv
  if (suggestions.length === 0 && MAPBOX_TOKEN) {
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?types=place,locality&limit=8&language=fr&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
      if (res.ok) {
        const data = await res.json();
        for (const f of data.features || []) {
          if (!f.center?.length) continue;
          const [lng, lat] = f.center;
          if (typeof lat !== "number" || typeof lng !== "number") continue;
          if (!isInFrancophoneZone(lat, lng)) continue;
          const cityName = f.text || f.place_name?.split(",")?.[0] || String(q);
          const ctx = f.context || [];
          const countryObj = ctx.find((c: any) => c.id?.startsWith("country"));
          const countryCode = (countryObj?.short_code?.toUpperCase() || "FR") as string;
          if (!FRANCOPHONE_COUNTRIES.includes(countryCode as any)) continue;
          const postcodeObj = ctx.find((c: any) => c.id?.startsWith("postcode"));
          const postcode = postcodeObj?.text || "";
          const countryLabel = COUNTRY_LABELS[countryCode] || countryCode;
          const displayLabel = countryCode === "FR" && postcode
            ? `${cityName} (${postcode.substring(0, 2)})`
            : `${cityName} (${countryLabel})`;
          const key = `${cityName}_${countryCode}_${postcode}`;
          if (seen.has(key)) continue;
          seen.add(key);
          suggestions.push({ label: cityName, displayLabel, coords: { lat, lng }, postcode, countryCode });
        }
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ suggestions });
}
