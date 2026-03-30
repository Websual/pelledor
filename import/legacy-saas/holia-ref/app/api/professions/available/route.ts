import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cache simple en mémoire pour éviter les requêtes répétées
const cache = new Map<string, { data: { ids: string[]; counts: Record<string, number> }; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes

function getCacheKey(city: string | null, bounds: string | null): string {
  return `professions-available-${city || 'no-city'}-${bounds || 'no-bounds'}`;
}

function getCachedData(key: string): { ids: string[]; counts: Record<string, number> } | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: { ids: string[]; counts: Record<string, number> }): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get("city");
    const bounds = searchParams.get("bounds"); // Format: "north,south,east,west"

    // Vérifier le cache
    const cacheKey = getCacheKey(city, bounds);
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Construire le where pour filtrer par zone géographique (même logique que /api/practitioners)
    const baseWhere: any = {
      is_active: true,
      AND: [
        {
          OR: [
            { is_verified: true },
            { is_claimed: false }
          ]
        }
      ]
    };

    // Filtrer par ville si fournie
    if (city) {
      // Correspondance exacte ou qui commence par le nom de la ville suivi d'un espace (pour gérer "Pau 64000")
      // Cela évite de matcher "Saint-PAUL-les-fonts" quand on cherche "Pau"
      baseWhere.AND.push({
        OR: [
          {
            location_city: {
              equals: city,
              mode: "insensitive",
            },
          },
          {
            location_city: {
              startsWith: `${city} `,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    // Filtrer par bounds si fourni (ajouter les conditions lat/lng)
    if (bounds) {
      const coords = bounds.split(',').map(coord => parseFloat(coord.trim()));
      const [north, south, east, west] = coords;
      
      if (coords.length === 4 && coords.every(coord => !isNaN(coord))) {
        baseWhere.AND.push({
          AND: [
            {
              lat: {
                gte: south,
                lte: north,
                not: null,
              },
            },
            {
              lng: {
                gte: west,
                lte: east,
                not: null,
              },
            },
          ],
        });
      }
    }

    // Utiliser findMany puis grouper manuellement (plus flexible pour les filtres complexes)
    const practitioners = await prisma.practitioners.findMany({
      where: baseWhere,
      select: {
        profession_id: true,
      },
    });

    // Grouper manuellement par profession_id et compter
    const professionCountMap = new Map<string, number>();
    practitioners.forEach((p) => {
      if (p.profession_id) {
        professionCountMap.set(p.profession_id, (professionCountMap.get(p.profession_id) || 0) + 1);
      }
    });

    // Convertir en tableau avec id et count
    const professionData = Array.from(professionCountMap.entries()).map(([id, count]) => ({
      id,
      count,
    }));

    // Pour compatibilité, retourner aussi juste les IDs
    const professionIds = professionData.map((item) => item.id);

    // Créer l'objet de réponse avec IDs et counts
    const responseData = {
      ids: professionIds,
      counts: professionData.reduce((acc, item) => {
        acc[item.id] = item.count;
        return acc;
      }, {} as Record<string, number>),
    };

    // Mettre en cache
    setCachedData(cacheKey, responseData);

    // Retourner les IDs et les counts
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error("Error fetching available professions:", error);
    return NextResponse.json(
      { error: "Failed to fetch available professions" },
      { status: 500 }
    );
  }
}
