import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

// Fonction helper pour recalculer la moyenne d'un praticien
async function recalculatePractitionerRating(practitionerId: string) {
  const visibleReviews = await prisma.reviews.findMany({
    where: {
      practitioner_id: practitionerId,
      is_hidden: false,
      needs_review: false,
    } as any,
  });

  const avgRating =
    visibleReviews.length > 0
      ? visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length
      : 0;

  await prisma.practitioners.update({
    where: { id: practitionerId },
    data: { rating_avg: avgRating },
  });
}

// Liste de mots pour la modération (simplifié - réutiliser la logique du POST si besoin)
const PROFANITY_WORDS = [
  "con", "connard", "connasse", "salope", "pute", "putain", "bordel", "enculé", "enfoiré",
  "fdp", "tg", "ntm", "nique", "merde", "nul", "pourri", "crétin", "imbécile",
  "arnaque", "escroc", "spam", "horrible", "dégueulasse",
];

function needsReviewCheck(comment: string | null | undefined, rating: number): boolean {
  if (!comment) return false;
  const normalized = comment.toLowerCase().trim();
  const wordCount = normalized.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount < 5) return true;
  for (const word of PROFANITY_WORDS) {
    if (normalized.includes(word)) return true;
  }
  if (rating <= 2 && wordCount < 10) return true;
  return false;
}

// PATCH: Modifier son propre avis
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateReviewSchema.parse(body);

    const review = await prisma.reviews.findFirst({
      where: { id },
      include: { practitioners: { select: { id: true, slug: true } } },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const needsReview = needsReviewCheck(validatedData.comment, validatedData.rating);

    const updated = await prisma.reviews.update({
      where: { id },
      data: {
        rating: validatedData.rating,
        comment: validatedData.comment ?? null,
        needs_review: needsReview,
        updated_at: new Date(),
      } as any,
    });

    await recalculatePractitionerRating(review.practitioner_id);

    return NextResponse.json({
      id: updated.id,
      rating: updated.rating,
      comment: updated.comment,
      response: updated.response,
      needsReview: updated.needs_review,
      updatedAt: updated.updated_at.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

// DELETE: Supprimer son propre avis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const review = await prisma.reviews.findFirst({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const practitionerId = review.practitioner_id;

    // Suppression de l'avis (la réponse est dans la même ligne, donc supprimée automatiquement - pas de contenu orphelin)
    await prisma.reviews.delete({
      where: { id },
    });

    await recalculatePractitionerRating(practitionerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
