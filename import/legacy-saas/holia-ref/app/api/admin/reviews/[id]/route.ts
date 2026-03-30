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

// PATCH: Modérer un avis (masquer/afficher)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isHidden, needsReview, ignoreReport } = body;

    // Vérifier que l'avis existe
    const review = await prisma.reviews.findFirst({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Mettre à jour l'avis
    const updateData: any = {
      updated_at: new Date(),
    };
    
    if (typeof isHidden === "boolean") {
      updateData.is_hidden = isHidden;
    }
    
    if (typeof needsReview === "boolean") {
      updateData.needs_review = needsReview;
    }

    if (ignoreReport === true) {
      updateData.is_flagged = false;
      updateData.flag_count = 0;
      updateData.flag_reason = null;
    }
    
    const updatedReview = await prisma.reviews.update({
      where: { id },
      data: updateData,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practitioners: {
          select: {
            id: true,
            title: true,
            location_city: true,
            slug: true,
          },
        },
        appointments: {
          select: {
            id: true,
            starts_at: true,
            services: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Recalculer la moyenne du praticien après modification de l'avis
    await recalculatePractitionerRating(review.practitioner_id);

    // Transformer les données pour correspondre au format attendu par le frontend
    return NextResponse.json({
      id: updatedReview.id,
      rating: updatedReview.rating,
      comment: updatedReview.comment,
      response: updatedReview.response,
      isHidden: updatedReview.is_hidden,
      isFlagged: (updatedReview as any).is_flagged || false,
      flagCount: (updatedReview as any).flag_count ?? 0,
      flagReason: (updatedReview as any).flag_reason || null,
      createdAt: updatedReview.created_at.toISOString(),
      user: updatedReview.users,
      practitioner: {
        id: updatedReview.practitioners.id,
        title: updatedReview.practitioners.title,
        locationCity: updatedReview.practitioners.location_city,
        slug: updatedReview.practitioners.slug,
      },
      needsReview: updatedReview.needs_review,
      appointment: updatedReview.appointments ? {
        id: updatedReview.appointments.id,
        startsAt: updatedReview.appointments.starts_at.toISOString(),
        service: updatedReview.appointments.services,
      } : null,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

// DELETE: Supprimer un avis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Vérifier que l'avis existe
    const review = await prisma.reviews.findFirst({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Récupérer le practitioner_id avant de supprimer l'avis
    const practitionerId = review.practitioner_id;

    // Supprimer l'avis
    await prisma.reviews.delete({
      where: { id },
    });

    // Recalculer la moyenne du praticien après suppression
    await recalculatePractitionerRating(practitionerId);

    return NextResponse.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}

