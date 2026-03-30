import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Cache pour les résultats (5 minutes)
export const revalidate = 300;

// Fonction pour calculer la distance en km (formule de Haversine)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const radius = searchParams.get("radius") || "30"; // 30km par défaut (strict)

    // Récupérer tous les sujets
    const subjects = await prisma.subjects.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    // Si on a des coordonnées, utiliser un rayon de recherche avec calcul de distance exacte
    let centerLat: number | null = null;
    let centerLng: number | null = null;
    let searchCityName: string | null = null;
    const radiusKm = parseFloat(radius); // Rayon strict en kilomètres

    if (latitude && longitude) {
      centerLat = parseFloat(latitude);
      centerLng = parseFloat(longitude);
      // Si on a aussi le nom de la ville, l'utiliser pour la comparaison
      if (city) {
        searchCityName = city;
      }
    } else if (city) {
      searchCityName = city;
    }

    // Pour chaque sujet, compter les praticiens disponibles
    const counts = await Promise.all(
      subjects.map(async (subject) => {
        // Récupérer les professionIds liés au sujet
        const subjectProfessions = await prisma.subject_professions.findMany({
          where: {
            subject_id: subject.id,
          },
          select: {
            profession_id: true,
          },
        });

        const professionIds = subjectProfessions.map((sp) => sp.profession_id);

        if (professionIds.length === 0) {
          return {
            subjectId: subject.id,
            slug: subject.slug,
            count: 0,
            inCity: 0,
            inRadius: 0,
          };
        }

        let whereClause: any = {
          is_active: true,
          profession_id: {
            in: professionIds,
          },
          lat: { not: null },
          lng: { not: null },
        };

        // Si on a des coordonnées, utiliser un pré-filtre géographique approximatif
        if (centerLat && centerLng) {
          const latRange = radiusKm / 111; // Approximation: 1 degré ≈ 111 km
          const lngRange = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
          
          whereClause.AND = [
            { lat: { gte: centerLat - latRange, lte: centerLat + latRange } },
            { lng: { gte: centerLng - lngRange, lte: centerLng + lngRange } },
          ];
        } else if (searchCityName) {
          // Correspondance exacte ou qui commence par le nom de la ville suivi d'un espace (pour gérer "Pau 64000")
          // Cela évite de matcher "Saint-PAUL-les-fonts" quand on cherche "Pau"
          // Utiliser AND pour combiner avec les conditions existantes
          whereClause.AND = whereClause.AND || [];
          whereClause.AND.push({
            OR: [
              {
                location_city: {
                  equals: searchCityName,
                  mode: "insensitive",
                },
              },
              {
                location_city: {
                  startsWith: `${searchCityName} `,
                  mode: "insensitive",
                },
              },
            ],
          });
        }
        // Si pas de ville ni de coordonnées, on garde whereClause sans filtre de ville
        // Cela retournera tous les praticiens en France (mode national)

        // Récupérer les praticiens avec leurs coordonnées
        const practitioners = await prisma.practitioners.findMany({
          where: whereClause,
          select: {
            id: true,
            lat: true,
            lng: true,
            location_city: true,
          },
        });

        // Si on a des coordonnées, calculer la distance exacte et filtrer strictement à 30km
        if (centerLat && centerLng) {
          let inCityCount = 0;
          let inRadiusCount = 0;

          practitioners.forEach((p) => {
            if (p.lat && p.lng) {
              const distance = calculateDistance(centerLat!, centerLng!, p.lat, p.lng);
              
              // Compter ceux dans le rayon strict de 30km (distance <= 30km)
              if (distance <= radiusKm) {
                inRadiusCount++;
                
                // Vérifier si dans la ville exacte : distance < 5km ET nom de ville correspond exactement
                if (distance < 5 && searchCityName && p.location_city) {
                  // Normaliser les noms de ville pour la comparaison (enlever accents, espaces, majuscules)
                  const normalizeCityName = (name: string) => {
                    return name
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
                      .replace(/\s+/g, ' ') // Normaliser les espaces
                      .trim();
                  };
                  
                  const normalizedSearchCity = normalizeCityName(searchCityName);
                  const normalizedPractitionerCity = normalizeCityName(p.location_city);
                  
                  // Correspondance exacte ou inclusion stricte (pour gérer les cas comme "Paris" vs "Paris 75001")
                  const cityMatch = 
                    normalizedPractitionerCity === normalizedSearchCity ||
                    normalizedPractitionerCity.startsWith(normalizedSearchCity + ' ') ||
                    normalizedSearchCity.startsWith(normalizedPractitionerCity + ' ');
                  
                  if (cityMatch) {
                    inCityCount++;
                  }
                }
              }
            }
          });

          return {
            subjectId: subject.id,
            slug: subject.slug,
            count: inRadiusCount, // Total dans le rayon
            inCity: inCityCount, // Dans la ville exacte
            inRadius: inRadiusCount - inCityCount, // Dans le rayon mais pas dans la ville
          };
        } else {
          // Si recherche par ville exacte, compter directement
          const count = practitioners.length;
          return {
            subjectId: subject.id,
            slug: subject.slug,
            count,
            inCity: count,
            inRadius: 0,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      counts,
    });
  } catch (error) {
    console.error("Error fetching subject counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch subject counts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
