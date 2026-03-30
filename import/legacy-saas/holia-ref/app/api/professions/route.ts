import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get("slug");

    // Si un slug est fourni, retourner une seule profession
    if (slug) {
      const profession = await prisma.professions.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              practitioners: {
                where: {
                  is_active: true,
                  OR: [
                    { is_verified: true },
                    { is_claimed: false }
                  ]
                }
              }
            }
          }
        }
      });

      if (!profession) {
        return NextResponse.json(
          { error: "Profession not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id: profession.id,
        name: profession.name,
        slug: profession.slug,
        practitionerCount: profession._count.practitioners
      });
    }

    // Sinon, retourner les professions
    const allProfessions = await prisma.professions.findMany({
      orderBy: { name: "asc" },
    });

    const all = searchParams.get("all") === "true";

    // Pour le profil praticien (?all=true) : retourner TOUTES les professions (82)
    if (all) {
      return NextResponse.json(
        allProfessions.map((prof) => ({
          id: prof.id,
          name: prof.name,
          slug: prof.slug,
        }))
      );
    }

    // Par défaut : compter les praticiens et filtrer celles qui en ont au moins 1
    const professionsWithCount = await Promise.all(
      allProfessions.map(async (prof) => {
        const count = await prisma.practitioners.count({
          where: {
            profession_id: prof.id,
            is_active: true,
            OR: [
              { is_verified: true },
              { is_claimed: false }
            ]
          }
        });
        return {
          id: prof.id,
          name: prof.name,
          slug: prof.slug,
          practitionerCount: count
        };
      })
    );

    const filteredProfessions = professionsWithCount.filter(
      (prof) => prof.practitionerCount > 0
    );

    return NextResponse.json(filteredProfessions);
  } catch (error) {
    console.error("Error fetching professions:", error);
    return NextResponse.json(
      { error: "Failed to fetch professions" },
      { status: 500 }
    );
  }
}