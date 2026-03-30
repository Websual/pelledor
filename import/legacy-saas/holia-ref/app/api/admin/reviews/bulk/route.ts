import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Fonction helper pour recalculer la moyenne d'un praticien
async function recalculatePractitionerRating(practitionerId: string) {
  // Récupérer uniquement les avis visibles (non masqués et non en attente de modération)
  const visibleReviews = await prisma.reviews.findMany({
    where: {
      practitioner_id: practitionerId,
      is_hidden: false,
      needs_review: false, // Exclure les avis en attente de modération
    } as any,
  });

  // Calculer la nouvelle moyenne
  const avgRating =
    visibleReviews.length > 0
      ? visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length
      : 0;

  // Mettre à jour la moyenne du praticien
  await prisma.practitioners.update({
    where: { id: practitionerId },
    data: { rating_avg: avgRating },
  });
}

// PATCH: Actions groupées sur plusieurs avis
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { ids, isHidden } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs array is required" },
        { status: 400 }
      );
    }

    if (typeof isHidden !== "boolean") {
      return NextResponse.json(
        { error: "isHidden must be a boolean" },
        { status: 400 }
      );
    }

    // Récupérer les practitioner_id avant la mise à jour pour recalculer leurs moyennes
    const reviewsToUpdate = await prisma.reviews.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        practitioner_id: true,
      },
    });

    // Mettre à jour tous les avis en une seule requête
    const result = await prisma.reviews.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        is_hidden: isHidden,
        updated_at: new Date(),
      },
    });

    // Recalculer la moyenne pour chaque praticien concerné (sans doublons)
    const practitionerIds: string[] = reviewsToUpdate
      .map(r => r.practitioner_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const uniquePractitionerIds: string[] = Array.from(new Set(practitionerIds));
    
    await Promise.all(
      uniquePractitionerIds.map((practitionerId: string) => 
        recalculatePractitionerRating(practitionerId)
      )
    );

    return NextResponse.json({
      success: true,
      updated: result.count,
    });
  } catch (error) {
    console.error("Error bulk updating reviews:", error);
    return NextResponse.json(
      { error: "Failed to update reviews" },
      { status: 500 }
    );
  }
}
