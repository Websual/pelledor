import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDistance } from "@/lib/distance";
import { cacheGet, cacheSet } from "@/lib/redis";

// Alias : lorsqu'on cherche une profession, inclure aussi les IDs vers lesquels on a migré les praticiens
const PROFESSION_ID_ALIASES: Record<string, string[]> = {
  sophrologue: ["sophrologue", "praticien-en-sophrologie"],
  hypnotiseur: ["hypnotiseur", "praticien-en-hypnose"],
  nutritionniste: ["nutritionniste", "conseiller-en-nutrition"],
  ostéopathe: ["ostéopathe", "praticien-en-therapie-manuelle"],
  acupuncteur: ["acupuncteur", "praticien-en-energetique-chinoise"],
};


const CACHE_TTL_SECONDS = 120; // 2 min

/** Include réduit : profession + services (prix/durée) + _count reviews */
const REDUCED_INCLUDE = {
  professions: { select: { id: true, name: true } },
  services: {
    orderBy: { price_cents: "asc" as const },
    take: 10,
    select: { id: true, name: true, price_cents: true, duration_min: true },
  },
  _count: { select: { reviews: true } },
};

function buildCacheKey(searchParams: URLSearchParams): string {
  const keys = Array.from(searchParams.keys()).sort();
  const parts = keys.map((k) => `${k}=${searchParams.get(k) ?? ""}`);
  return "practitioners:" + parts.join("&");
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cacheKey = buildCacheKey(searchParams);
    const cached = await cacheGet<{ practitioners: unknown[]; pagination: unknown }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const city = searchParams.get("city");
    const categoryId = searchParams.get("categoryId");
    const subjectId = searchParams.get("subjectId");
    const professionId = searchParams.get("professionId");
    const query = searchParams.get("q"); // General search query (name, specialty, etc.)
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const distance = searchParams.get("distance") || "50"; // km
    const bounds = searchParams.get("bounds"); // Format: "north,south,east,west"
    const minRating = searchParams.get("minRating");
    const maxPrice = searchParams.get("maxPrice");
    const sortBy = searchParams.get("sortBy") || "rating"; // "rating", "price", or "distance"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "40");
    const skip = (page - 1) * limit;

    // Visibilité : actifs OU vérifiés (les validés admin doivent toujours apparaître en recherche)
    const baseWhere: any = {
      AND: [
        {
          OR: [
            { is_active: true },
            { is_verified: true },
          ]
        }
      ]
    };

    if (professionId || categoryId) {
      const idToSearch = professionId || categoryId;
      const idsToSearch = PROFESSION_ID_ALIASES[idToSearch]
        ? PROFESSION_ID_ALIASES[idToSearch]
        : [idToSearch];
      baseWhere.profession_id = { in: idsToSearch };
    }

    if (city && city.trim() !== "") {
      // Extraire le nom de ville principal (ex: "Namur (Belgique)" → "Namur", "Paris (75)" → "Paris")
      const citySearch = city.replace(/\s*\([^)]*\)\s*$/, "").trim() || city;
      // Recherche par contains : inclut Namur, Paris, villes avec code postal, etc.
      baseWhere.AND.push({
        location_city: {
          contains: citySearch,
          mode: "insensitive",
        },
      });
    }

    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      if (!Number.isNaN(minRatingNum)) {
        baseWhere.AND.push({
          OR: [
            { rating_avg: { gte: minRatingNum } },
            {
              reviews: { none: {} },
              google_rating: { gte: minRatingNum },
            },
          ],
        });
      }
    }

    // Bounds (carte) : filtre en BDD
    if (bounds) {
      const coords = bounds.split(",").map((c) => parseFloat(c.trim()));
      const [north, south, east, west] = coords;
      if (coords.length === 4 && coords.every((c) => !Number.isNaN(c))) {
        baseWhere.AND.push(
          { lat: { not: null }, lng: { not: null } },
          { lat: { gte: south, lte: north }, lng: { gte: west, lte: east } }
        );
      }
    }

    // maxPrice : au moins un service <= maxPrice (filtre en BDD)
    if (maxPrice) {
      const maxPriceCents = parseInt(maxPrice) * 100;
      if (!Number.isNaN(maxPriceCents)) {
        baseWhere.AND.push({
          services: { some: { price_cents: { lte: maxPriceCents } } },
        });
      }
    }

    // Distance (lat/lng) : pré-filtre par bounding box en BDD pour réduire le jeu
    if (lat && lng && !bounds) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxDistKm = parseFloat(distance) || 50;
      if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
        const deltaLat = maxDistKm / 111;
        const deltaLng = maxDistKm / (111 * Math.max(0.1, Math.cos((userLat * Math.PI) / 180)));
        baseWhere.AND.push(
          { lat: { not: null }, lng: { not: null } },
          {
            lat: { gte: userLat - deltaLat, lte: userLat + deltaLat },
            lng: { gte: userLng - deltaLng, lte: userLng + deltaLng },
          }
        );
      }
    }

    // Handle general search query (name, title, bio, profession)
    let where: any = { ...baseWhere };
    if (query) {
      // Rechercher dans le titre du praticien (title), la bio, le nom de l'utilisateur et le nom de la profession
      // Même si professionId est déjà défini, on cherche aussi dans title pour permettre recherche par nom + profession
      const searchConditions: any[] = [
        {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          bio: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          users: {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
        {
          professions: {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      ];
      
      // Si on a déjà des conditions AND avec OR, les combiner
      if (where.AND && where.AND.length > 0) {
        where.AND.push({ OR: searchConditions });
      } else if (where.OR && where.OR.length > 0) {
        // Si on a déjà des conditions OR, les combiner avec AND
        where.AND = [
          ...(where.AND || []),
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const needsInMemoryFilter =
      !!subjectId || sortBy === "price" || (!!lat && !!lng);

    let allPractitioners: any[];
    let total: number;
    let isFastPath = false;

    if (!needsInMemoryFilter && sortBy === "rating") {
      // Chemin rapide : tri par note uniquement, pagination en BDD
      isFastPath = true;
      const [totalCount, pageRows] = await Promise.all([
        prisma.practitioners.count({ where }),
        prisma.practitioners.findMany({
          where,
          include: REDUCED_INCLUDE,
          orderBy: { rating_avg: "desc" },
          skip,
          take: limit,
        }),
      ]);
      total = totalCount;
      allPractitioners = pageRows;
    } else {
      // Chemin lent : subjectId, tri par prix ou par distance → filtre/tri en mémoire puis slice
      const cap = 5000;
      allPractitioners = await prisma.practitioners.findMany({
        where,
        include: REDUCED_INCLUDE,
        orderBy: { rating_avg: "desc" },
        take: cap,
      });
    }

    // Filter by subjectId (keywords : pas de relation directe en BDD, on garde en mémoire)
    if (subjectId) {
      const subject = await prisma.subjects.findUnique({
        where: { id: subjectId },
      });
      if (subject) {
        allPractitioners = allPractitioners.filter((practitioner: any) => {
          const hasSubjectInKeywords = practitioner.treatment_keywords?.some(
            (keyword: string) =>
              keyword.toLowerCase().includes(subject.slug.toLowerCase()) ||
              keyword.toLowerCase().includes(subject.name.toLowerCase())
          );
          return hasSubjectInKeywords;
        });
      }
    }

    // Distance : filtre et ajout de la propriété distance (bounds déjà appliqué en BDD si pas de bounds)
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxDistance = parseFloat(distance);

      // Calculate distance for all practitioners and filter by max distance
      allPractitioners = allPractitioners
        .map((practitioner) => {
          if (!practitioner.lat || !practitioner.lng) {
            return { ...practitioner, distance: Infinity };
          }

          const dist = calculateDistance(
            userLat,
            userLng,
            practitioner.lat,
            practitioner.lng
          );

          return { ...practitioner, distance: dist, slug: practitioner.slug };
        })
        .filter((practitioner: any) => practitioner.distance <= maxDistance);
    }

    // Sort + total + pagination (sauf chemin rapide où c'est déjà fait en BDD)
    let sortedPractitioners = allPractitioners;
    if (!isFastPath) {
      if (sortBy === "price") {
        sortedPractitioners = [...allPractitioners].sort((a, b) => {
          const minPriceA = a.services?.length
            ? Math.min(...a.services.map((s: any) => s.price_cents))
            : Infinity;
          const minPriceB = b.services?.length
            ? Math.min(...b.services.map((s: any) => s.price_cents))
            : Infinity;
          return minPriceA - minPriceB;
        });
      } else if (sortBy === "distance" && lat && lng) {
        sortedPractitioners = [...allPractitioners].sort((a: any, b: any) => {
          const distA = a.distance ?? Infinity;
          const distB = b.distance ?? Infinity;
          return distA - distB;
        });
      } else {
        sortedPractitioners = [...allPractitioners].sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0));
      }
    }

    if (!isFastPath) {
      total = sortedPractitioners.length;
    }

    const paginatedPractitioners = isFastPath
      ? allPractitioners
      : sortedPractitioners.slice(skip, skip + limit);

    // Filter services by maxPrice for display and ensure slug is included
    const practitioners = paginatedPractitioners.map((practitioner: any) => {
      // Explicitly construct the result object to ensure slug is included
      const result = {
        id: practitioner.id,
        userId: practitioner.user_id,
        title: practitioner.title,
        slug: practitioner.slug || `practitioner-${practitioner.id}`, // Explicit slug with fallback
        bio: practitioner.bio,
        address: practitioner.address,
        locationCity: practitioner.location_city,
        lat: practitioner.lat,
        lng: practitioner.lng,
        professionId: practitioner.profession_id,
        photoUrl: practitioner.photo_url,
        isVerified: practitioner.is_verified,
        isClaimed: practitioner.is_claimed ?? true,
        ratingAvg: practitioner.rating_avg,
        googleRating: practitioner.google_rating ?? null,
        googleReviewCount: practitioner.google_review_count ?? null,
        phone: practitioner.phone || null,
        website: practitioner.website || null,
        instagramUrl: practitioner.instagram_url || null,
        linkedInUrl: practitioner.linked_in_url || null,
        facebookUrl: practitioner.facebook_url || null,
        languages: practitioner.languages || [],
        paymentMethods: practitioner.paymentMethods || [],
        createdAt: practitioner.created_at,
        updatedAt: practitioner.updated_at,
        profession: practitioner.professions,
        services: (maxPrice
          ? practitioner.services.filter((s) => s.price_cents <= parseInt(maxPrice) * 100)
          : practitioner.services
        ).map((s) => ({
          id: s.id,
          name: s.name,
          priceCents: s.price_cents,
          durationMin: s.duration_min,
        })),
        _count: practitioner._count || { reviews: 0 },
        ...(practitioner.distance !== undefined && { distance: practitioner.distance }),
      };

      return result;
    });

    const totalPages = Math.ceil(total / limit);

    const payload = {
      practitioners,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
    await cacheSet(cacheKey, payload, CACHE_TTL_SECONDS);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching practitioners:", error);
    return NextResponse.json(
      { error: "Failed to fetch practitioners" },
      { status: 500 }
    );
  }
}

