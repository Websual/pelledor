import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/professions/[slug]/mutuelles
 * Retourne le nombre de mutuelles qui remboursent cette profession.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const profession = await prisma.professions.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        _count: {
          select: { profession_mutuelles: true },
        },
        profession_mutuelles: {
          include: { mutuelle: { select: { name: true, slug: true } } },
        },
      },
    });

    if (!profession) {
      return NextResponse.json(
        { error: "Profession not found" },
        { status: 404 }
      );
    }

    const count = profession._count.profession_mutuelles;
    return NextResponse.json({
      professionId: profession.id,
      professionName: profession.name,
      professionSlug: profession.slug,
      mutuellesCount: count,
      mutuelles:
        count > 0
          ? profession.profession_mutuelles.map((pm) => ({
              name: pm.mutuelle.name,
              slug: pm.mutuelle.slug,
            }))
          : [],
    });
  } catch (error) {
    console.error("Error fetching profession mutuelles:", error);
    return NextResponse.json(
      { error: "Failed to fetch mutuelles" },
      { status: 500 }
    );
  }
}
