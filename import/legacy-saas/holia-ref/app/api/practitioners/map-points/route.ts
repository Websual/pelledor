import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";

const MAP_POINTS_CACHE_TTL = 120; // 2 min

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profession = searchParams.get("profession");
    const professionIds = searchParams.getAll("professionIds"); // Récupérer tous les professionIds
    const subjectId = searchParams.get("subjectId"); // ID du sujet pour filtrer via la relation
    const city = searchParams.get("city");
    const bounds = searchParams.get("bounds"); // "north,south,east,west" — zone visible = moins de points
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const radius = searchParams.get("radius");

    const cacheKey =
      "map-points:" +
      Array.from(searchParams.keys())
        .sort()
        .map((k) => `${k}=${searchParams.get(k) ?? ""}`)
        .join("&");
    const cached = await cacheGet<{ success: boolean; data: object }>(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Même visibilité que la liste recherche : actifs OU vérifiés (ex. Namur/Belgique)
    let where: any = {
      AND: [
        {
          OR: [
            { is_active: true },
            { is_verified: true },
          ],
        },
        { lat: { not: null }, lng: { not: null } },
      ],
    };

    // Filtre par sujet (priorité la plus haute) - récupère les professionIds liés au sujet
    if (subjectId) {
      try {
        const subjectProfessions = await prisma.subject_professions.findMany({
          where: {
            subject_id: subjectId
          },
          select: {
            profession_id: true
          }
        });

        const subjectProfessionIds = subjectProfessions.map(sp => sp.profession_id);

        if (subjectProfessionIds.length > 0) {
          where.profession_id = {
            in: subjectProfessionIds
          };
        } else {
          // Si aucun professionId n'est lié au sujet, retourner une liste vide
          return NextResponse.json({
            success: true,
            data: {
              type: 'FeatureCollection',
              features: []
            },
          });
        }
      } catch (error) {
        console.error("Error fetching subject professions:", error);
        // En cas d'erreur, continuer sans filtre (fallback)
      }
    } else if (professionIds.length > 0) {
      // Filtre par professionIds (tableau)
      where.profession_id = {
        in: professionIds
      };
    } else if (profession) {
      // Filtre par profession (single)
      where.profession_id = profession;
    }

    // Filtre par rayon géographique si coordonnées fournies (priorité sur city)
    if (latitude && longitude && radius) {
      const centerLat = parseFloat(latitude);
      const centerLng = parseFloat(longitude);
      const rad = parseFloat(radius);
      const deltaLat = rad / 111;
      const deltaLng = rad / (111 * Math.cos((centerLat * Math.PI) / 180));
      where.AND = [
        ...where.AND,
        { lat: { gte: centerLat - deltaLat, lte: centerLat + deltaLat } },
        { lng: { gte: centerLng - deltaLng, lte: centerLng + deltaLng } },
      ];
    } else if (city) {
      // Filtre par ville : extraire le nom principal (ex: "Namur (Belgique)" → "Namur")
      const citySearch = city.replace(/\s*\([^)]*\)\s*$/, "").trim() || city;
      where.location_city = {
        contains: citySearch,
        mode: "insensitive",
      };
    }

    // Bounds + limite : uniquement quand une ville est recherchée (on peut restreindre à la zone visible)
    // Sans ville (recherche par défaut) = on renvoie TOUT pour garder la richesse de la carte (68k points)
    let take: number | undefined;
    if (city && bounds) {
      const coords = bounds.split(",").map((c) => parseFloat(c.trim()));
      const [north, south, east, west] = coords;
      if (coords.length === 4 && coords.every((c) => !Number.isNaN(c))) {
        where.AND.push(
          { lat: { gte: south, lte: north } },
          { lng: { gte: west, lte: east } }
        );
      }
      const limitParam = searchParams.get("limit");
      take = limitParam != null ? Math.min(2000, Math.max(1, parseInt(limitParam, 10) || 1000)) : 2000;
    }

    const practitioners = await prisma.practitioners.findMany({
      where,
      ...(take != null && { take }),
      select: {
        id: true,
        slug: true,
        title: true,
        lat: true,
        lng: true,
        location_city: true,
        address: true,
        profession_id: true,
        photo_url: true,
        phone: true,
        website: true,
        instagram_url: true,
        linked_in_url: true,
        facebook_url: true,
        google_rating: true,
        google_review_count: true,
        professions: {
          select: {
            name: true,
          },
        },
        rating_avg: true,
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: {
        rating_avg: "desc",
      },
    });

    // Formater les données pour la carte au format GeoJSON attendu par Mapbox
    const features = practitioners.map((practitioner) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [practitioner.lng, practitioner.lat]
      },
      properties: {
        id: practitioner.id,
        practitionerId: practitioner.id,
        slug: practitioner.slug,
        title: practitioner.title,
        location_city: practitioner.location_city || "",
        photo_url: practitioner.photo_url || null,
        profession: practitioner.professions?.name || "Praticien",
        rating: practitioner.rating_avg ?? 0,
        reviewsCount: practitioner._count.reviews || 0,
        googleRating: practitioner.google_rating ?? null,
        googleReviewCount: practitioner.google_review_count ?? null,
        website: practitioner.website || null,
        phone: practitioner.phone || null,
        instagramUrl: practitioner.instagram_url || null,
        linkedInUrl: practitioner.linked_in_url || null,
        facebookUrl: practitioner.facebook_url || null,
        profileUrl: `/praticien/${practitioner.slug}`,
      }
    }));

    const geoJsonData = {
      type: "FeatureCollection",
      features,
    };

    const payload = { success: true, data: geoJsonData };
    await cacheSet(cacheKey, payload, MAP_POINTS_CACHE_TTL);
    return NextResponse.json(payload);

  } catch (error) {
    console.error("Error fetching map points:", error);
    return NextResponse.json(
      { error: "Failed to fetch map points", details: error.message },
      { status: 500 }
    );
  }
}