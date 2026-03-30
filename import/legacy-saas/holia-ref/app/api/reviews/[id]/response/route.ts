import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const responseSchema = z.object({
  response: z.string().min(1, "La réponse est requise").max(1000, "La réponse ne peut pas dépasser 1000 caractères"),
});

// PATCH: Ajouter/modifier une réponse à un avis
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = responseSchema.parse(body);

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Vérifier que l'avis existe et appartient au praticien
    const review = await prisma.reviews.findFirst({
      where: { id },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    if (review.practitioner_id !== practitioner.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mettre à jour la réponse
    const updatedReview = await prisma.reviews.update({
      where: { id },
      data: {
        response: validatedData.response,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            image: true,
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

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error("Error updating review response:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update review response" },
      { status: 500 }
    );
  }
}

// DELETE: Supprimer une réponse à un avis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Vérifier que l'avis existe et appartient au praticien
    const review = await prisma.reviews.findFirst({
      where: { id },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    if (review.practitioner_id !== practitioner.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Supprimer la réponse
    const updatedReview = await prisma.reviews.update({
      where: { id },
      data: {
        response: null,
      },
    });

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error("Error deleting review response:", error);
    return NextResponse.json(
      { error: "Failed to delete review response" },
      { status: 500 }
    );
  }
}

