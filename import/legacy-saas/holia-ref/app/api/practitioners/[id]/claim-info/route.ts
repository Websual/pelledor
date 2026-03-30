import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const practitioner = await prisma.practitioners.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        bio: true,
        address: true,
        location_city: true,
        phone: true,
        photo_url: true,
        source_url: true,
        is_claimed: true,
        profession_id: true,
        professions: {
          select: {
            id: true,
            name: true,
          },
        },
      }
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 });
    }

    if (practitioner.is_claimed) {
      return NextResponse.json({ error: "Ce profil a déjà été réclamé" }, { status: 409 });
    }

    return NextResponse.json({
      id: practitioner.id,
      title: practitioner.title,
      bio: practitioner.bio,
      address: practitioner.address,
      locationCity: practitioner.location_city,
      phone: practitioner.phone,
      photoUrl: practitioner.photo_url,
      sourceUrl: practitioner.source_url,
      professionId: practitioner.professions ? practitioner.profession_id : null,
      professionName: practitioner.professions?.name || null,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil à réclamer:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}