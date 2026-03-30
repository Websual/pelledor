import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";




// GET: Récupérer les favoris de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favorites.findMany({
      where: {
        user_id: session.user.id,
      },
      include: {
        practitioners: {
          include: {
            professions: true,
            services: {
              orderBy: {
                price_cents: "asc",
              },
            },
            _count: {
              select: {
                reviews: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Transformer les données pour correspondre à l'interface attendue
    const transformedFavorites = favorites.map((favorite) => ({
      id: favorite.id,
      practitionerId: favorite.practitioner_id,
      privateNote: (favorite as any).private_note || null,
      createdAt: favorite.created_at.toISOString(),
      practitioner: {
        id: favorite.practitioners.id,
        slug: favorite.practitioners.slug || "",
        title: favorite.practitioners.title,
        bio: favorite.practitioners.bio,
        locationCity: favorite.practitioners.location_city,
        ratingAvg: favorite.practitioners.rating_avg || 0,
        isVerified: favorite.practitioners.is_verified || false,
        photoUrl: favorite.practitioners.photo_url,
        category: favorite.practitioners.professions ? {
          id: favorite.practitioners.professions.id,
          name: favorite.practitioners.professions.name,
          slug: favorite.practitioners.professions.slug,
        } : null,
        services: favorite.practitioners.services.map((s) => ({
          id: s.id,
          name: s.name,
          priceCents: s.price_cents,
          durationMin: s.duration_min,
        })),
        _count: {
          reviews: favorite.practitioners._count.reviews,
        },
      },
    }));

    return NextResponse.json(transformedFavorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

// POST: Ajouter un praticien aux favoris
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { practitionerId } = body;

    if (!practitionerId) {
      return NextResponse.json(
        { error: "Practitioner ID is required" },
        { status: 400 }
      );
    }

    // Vérifier que le praticien existe
    const practitioner = await prisma.practitioners.findFirst({
      where: { id: practitionerId },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Vérifier si le favori existe déjà
    const existingFavorite = await prisma.favorites.findFirst({
      where: {
        user_id: session.user.id,
        practitioner_id: practitionerId,
      },
    });

    if (existingFavorite) {
      return NextResponse.json(
        { error: "Practitioner is already in favorites" },
        { status: 400 }
      );
    }

    // Créer le favori
    const favorite = await prisma.favorites.create({
      data: {
        id: createId(),
        user_id: session.user.id,
        practitioner_id: practitionerId,
      } as any,
      include: {
        practitioners: {
          include: {
            professions: true,
            services: {
              take: 1,
              orderBy: {
                price_cents: "asc",
              },
            },
            _count: {
              select: {
                reviews: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    console.error("Error creating favorite:", error);
    return NextResponse.json(
      { error: "Failed to create favorite" },
      { status: 500 }
    );
  }
}

// PATCH: Mettre à jour la note privée d'un favori
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { favoriteId, privateNote } = body;

    if (!favoriteId) {
      return NextResponse.json(
        { error: "Favorite ID is required" },
        { status: 400 }
      );
    }

    const favorite = await prisma.favorites.findFirst({
      where: {
        id: favoriteId,
        user_id: session.user.id,
      },
    });

    if (!favorite) {
      return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    }

    await prisma.favorites.update({
      where: { id: favoriteId },
      data: {
        private_note: typeof privateNote === "string" ? privateNote : null,
      } as any,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating favorite note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

// DELETE: Supprimer un praticien des favoris
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const practitionerId = searchParams.get("practitionerId");

    if (!practitionerId) {
      return NextResponse.json(
        { error: "Practitioner ID is required" },
        { status: 400 }
      );
    }

    // Supprimer le favori
    const favorite = await prisma.favorites.findFirst({
      where: {
        user_id: session.user.id,
        practitioner_id: practitionerId,
      },
    });

    if (!favorite) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 }
      );
    }

    await prisma.favorites.delete({
      where: {
        id: favorite.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting favorite:", error);
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete favorite" },
      { status: 500 }
    );
  }
}

