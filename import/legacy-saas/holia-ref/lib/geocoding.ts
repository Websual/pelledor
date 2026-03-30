/**
 * Fonction de géocodage utilisant OpenStreetMap Nominatim API
 * Convertit une adresse en coordonnées latitude/longitude
 */

interface GeocodingResult {
  lat: number;
  lng: number;
}

/**
 * Géocode une ville via Mapbox (recherche mondiale, privilégie le français).
 * Utilisé comme fallback pour les pays francophones limitrophes (BE, CH, LU, etc.)
 */
export async function geocodeCityWithMapbox(
  query: string
): Promise<{ lat: number; lng: number; name: string; countryCode?: string } | null> {
  try {
    const token =
      process.env.MAPBOX_TOKEN ||
      process.env.MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return null;

    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?types=place,locality&limit=5&language=fr&access_token=${token}`;
    const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.features?.length) return null;

    const feature = data.features[0];
    const [lng, lat] = feature.center;
    if (typeof lat !== "number" || typeof lng !== "number") return null;

    const name = feature.text || feature.place_name?.split(",")?.[0] || query;
    const countryCode = feature.context?.find((c: any) => c.id?.startsWith("country"))?.short_code?.toUpperCase();

    return { lat, lng, name, countryCode };
  } catch {
    return null;
  }
}

export async function geocodeAddress(
  address: string,
  city: string
): Promise<GeocodingResult | null> {
  try {
    // Construire la requête complète : adresse + ville
    // Nettoyer l'adresse des espaces superflus
    const cleanAddress = address?.trim() || "";
    const cleanCity = city?.trim() || "";

    // Adresse complète : si l'adresse contient déjà la ville (ex. "rue X, 64000 Pau"), ne pas dupliquer
    const fullAddress = cleanAddress
      ? cleanCity
        ? `${cleanAddress}, ${cleanCity}`
        : cleanAddress
      : cleanCity;

    if (!fullAddress) {
      console.warn("Address or city is required for geocoding");
      return null;
    }

    console.log(`Geocoding address: "${fullAddress}"`);

    // Priorité 1: Utiliser l'API Adresse Gouv (limitée à la France)
    try {
      const adresseResponse = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`
      );
      if (adresseResponse.ok) {
        const adresseData = await adresseResponse.json();
        if (adresseData.features && adresseData.features.length > 0) {
          const feature = adresseData.features[0];
          const [lng, lat] = feature.geometry.coordinates;

          // Valider que les coordonnées sont en France (latitude entre 41 et 51)
          if (lat >= 41 && lat <= 51 && lng >= -5 && lng <= 10) {
            console.log("API Adresse Gouv geocoding OK:", { lat, lng });
            return { lat, lng };
          } else {
            console.warn(`API Adresse Gouv returned coordinates (${lat}, ${lng}) outside France bounds`);
          }
        }
      }
    } catch (adresseError) {
      console.warn("API Adresse Gouv failed, falling back to Mapbox:", adresseError);
    }

    // Fallback: Mapbox pour adresses complètes (France ou francophone limitrophe)
    const mapboxResult = await geocodeWithMapboxWorldwide(fullAddress);
    if (mapboxResult) {
      console.log("Mapbox geocoding OK:", mapboxResult);
      return mapboxResult;
    }

    // Encoder l'adresse pour l'URL (Nominatim)
    const encodedAddress = encodeURIComponent(fullAddress);

    // Ajouter un petit délai pour respecter le rate limit de Nominatim (1 requête/seconde)
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=5&countrycodes=fr,be,ch,lu,mc&addressdetails=1&extratags=1&namedetails=1`,
      {
        headers: { "Accept-Language": "fr-FR,fr" },
      }
    );

    if (!response.ok) {
      console.error("Geocoding API error:", response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn("No geocoding results for address:", fullAddress);
      return null;
    }

    const sortedResults = data.sort((a: any, b: any) => {
      const aImportance = a.importance || 0;
      const bImportance = b.importance || 0;
      const typePriority: Record<string, number> = {
        house: 5, building: 4, place: 3, road: 2, town: 1, city: 1,
      };
      const aTypePriority = typePriority[a.type || ""] || 0;
      const bTypePriority = typePriority[b.type || ""] || 0;
      return (bImportance * 10 + bTypePriority) - (aImportance * 10 + aTypePriority);
    });

    const result = sortedResults[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) return null;

    const importance = result.importance || 0;
    if (importance < 0.3) {
      console.warn(`Low importance result for "${fullAddress}"`);
    }

    // Accepter les pays francophones limitrophes (France, Belgique, Suisse, Luxembourg, Monaco)
    const inFrancophoneZone = (lat >= 43 && lat <= 52 && lng >= -5 && lng <= 11);
    if (!inFrancophoneZone) {
      console.warn(`Coordinates (${lat}, ${lng}) outside francophone zone`);
      return null;
    }

    return { lat, lng };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/** Résultat du géocodage inverse (coordonnées → adresse). */
export interface ReverseGeocodeResult {
  city: string;
  postcode: string | null;
  label?: string;
}

/**
 * Géocodage inverse : lat/lng → ville et code postal.
 * Utilise l'API Adresse (data.gouv.fr), puis Mapbox en fallback.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}&limit=1`
    );
    if (res.ok) {
      const data = await res.json();
      const f = data?.features?.[0];
      if (f?.properties) {
        const city = f.properties.city?.trim();
        const postcode = f.properties.postcode?.trim() ?? null;
        const label = f.properties.label?.trim();
        if (city) return { city, postcode, label };
      }
    }
    const token =
      process.env.MAPBOX_TOKEN ||
      process.env.MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (token) {
      const mb = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality,postcode&limit=1&language=fr&access_token=${token}`
      );
      if (mb.ok) {
        const mbData = await mb.json();
        const feat = mbData?.features?.[0];
        if (feat?.place_name) {
          const parts = feat.place_name.split(",").map((s: string) => s.trim());
          const city = parts[0] ?? "France";
          const postcodeMatch = parts.find((s: string) => /^\d{5}/.test(s));
          return { city, postcode: postcodeMatch?.slice(0, 5) ?? null, label: feat.place_name };
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Mapbox recherche mondiale (adresses), privilégie le français - pour pays francophones limitrophes */
async function geocodeWithMapboxWorldwide(fullAddress: string): Promise<GeocodingResult | null> {
  try {
    const token =
      process.env.MAPBOX_TOKEN ||
      process.env.MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return null;

    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json` +
      `?limit=5&language=fr&types=address,place&access_token=${token}`;
    const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.features?.length) return null;

    const sorted = data.features.sort((a: any, b: any) =>
      (b.relevance || 0) - (a.relevance || 0)
    );
    const best = sorted[0];
    if (!best?.center?.length) return null;

    const [lng, lat] = best.center;
    if (typeof lat !== "number" || typeof lng !== "number") return null;

    // Limiter aux pays francophones : France, Belgique, Suisse, Luxembourg, Monaco
    const inFrancophoneZone = lat >= 43 && lat <= 52 && lng >= -5 && lng <= 11;
    if (!inFrancophoneZone) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}
