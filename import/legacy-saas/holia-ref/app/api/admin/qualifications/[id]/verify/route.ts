import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyDocumentVerified } from "@/lib/notifications";




export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isVerified } = body;

    if (typeof isVerified !== "boolean") {
      return NextResponse.json(
        { error: "isVerified must be a boolean" },
        { status: 400 }
      );
    }

    // Récupérer la qualification avec le praticien
    const qualification = await prisma.qualifications.findUnique({
      where: { id },
      include: {
        practitioners: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!qualification) {
      return NextResponse.json(
        { error: "Qualification not found" },
        { status: 404 }
      );
    }

    // Mettre à jour le statut de vérification
    const updated = await prisma.qualifications.update({
      where: { id },
      data: {
        is_verified: isVerified,
      },
    });

    // Si la qualification est validée, créer une notification
    if (isVerified && !qualification.is_verified) {
      try {
        await notifyDocumentVerified({
          practitionerUserId: qualification.practitioners.user_id || "",
          qualificationTitle: qualification.title,
        });
      } catch (notifError) {
        console.error("Error creating document verification notification:", notifError);
        // Ne pas faire échouer la validation si la notification échoue
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error verifying qualification:", error);
    return NextResponse.json(
      { error: "Failed to verify qualification" },
      { status: 500 }
    );
  }
}

