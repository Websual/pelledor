import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchQuery = query.toLowerCase().trim();
    const limit = 8; // Limite totale de 8 résultats

    // Rechercher dans les professions et les praticiens en parallèle
    const [professions, practitioners] = await Promise.all([
      // Recherche dans les professions
      prisma.professions.findMany({
        where: {
          name: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        take: 4, // Limiter à 4 professions max
        orderBy: {
          name: "asc",
        },
      }),
      // Recherche dans les praticiens (par titre ou nom d'utilisateur)
      prisma.practitioners.findMany({
        where: {
          is_active: true,
          AND: [
            {
              OR: [
                { is_verified: true },
                { is_claimed: false },
              ],
            },
            {
              OR: [
                {
                  title: {
                    contains: searchQuery,
                    mode: "insensitive",
                  },
                },
                {
                  users: {
                    name: {
                      contains: searchQuery,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          users: {
            select: {
              name: true,
            },
          },
        },
        take: 4, // Limiter à 4 praticiens max
        orderBy: {
          rating_avg: "desc", // Trier par note décroissante
        },
      }),
    ]);

    // Construire les suggestions
    const suggestions: Array<{
      type: "profession" | "practitioner";
      label: string;
      slug: string;
      id?: string; // Profession id pour /recherche?professionId=
    }> = [];

    // Ajouter les professions
    professions.forEach((profession) => {
      suggestions.push({
        type: "profession",
        label: profession.name,
        slug: profession.slug,
        id: profession.id,
      });
    });

    // Ajouter les praticiens
    practitioners.forEach((practitioner) => {
      const name = practitioner.title || practitioner.users?.name || "Praticien";
      suggestions.push({
        type: "practitioner",
        label: name,
        slug: practitioner.slug,
      });
    });

    // Limiter à 8 résultats au total et mélanger pour équilibrer professions/praticiens
    const shuffled = suggestions.sort(() => Math.random() - 0.5);
    const limited = shuffled.slice(0, limit);

    return NextResponse.json({ suggestions: limited });
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
