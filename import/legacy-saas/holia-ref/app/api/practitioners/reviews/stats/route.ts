import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: {
        id: true,
        rating_avg: true,
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Compter les avis
    const reviewsCount = await prisma.reviews.count({
      where: {
        practitioner_id: practitioner.id,
        is_hidden: false,
      },
    });

    // Compter les favoris
    const favoritesCount = await prisma.favorites.count({
      where: {
        practitioner_id: practitioner.id,
      },
    });

    return NextResponse.json({
      averageRating: practitioner.rating_avg || 0,
      reviewsCount,
      favoritesCount,
    });
  } catch (error) {
    console.error("Error fetching review stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch review stats" },
      { status: 500 }
    );
  }
}
