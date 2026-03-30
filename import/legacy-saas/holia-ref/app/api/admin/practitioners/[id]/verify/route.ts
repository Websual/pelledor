import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPractitionerVerificationEmail, sendPractitionerRejectionEmail } from "@/lib/emails";




// POST: Valider un praticien
export async function POST(
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

    // Vérifier que le praticien existe
    const practitioner = await prisma.practitioners.findFirst({
      where: { id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Valider le praticien
    const updatedPractitioner = await prisma.practitioners.update({
      where: { id },
      data: {
        is_verified: true,
        is_active: true, // Activer automatiquement lors de la validation
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        professions: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Envoyer un email de confirmation au praticien
    const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/pro/profile`;
    try {
      await sendPractitionerVerificationEmail({
        practitionerName: updatedPractitioner.users?.name || updatedPractitioner.title,
        practitionerEmail: updatedPractitioner.users?.email || "",
        profileUrl: profileUrl,
      });
    } catch (emailError) {
      console.error("Error sending practitioner verification email:", emailError);
      // Ne pas faire échouer la validation si l'email échoue
    }

    return NextResponse.json(updatedPractitioner);
  } catch (error) {
    console.error("Error verifying practitioner:", error);
    return NextResponse.json(
      { error: "Failed to verify practitioner" },
      { status: 500 }
    );
  }
}

// DELETE: Rejeter un praticien
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

    // Vérifier que le praticien existe
    const practitioner = await prisma.practitioners.findFirst({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Récupérer le body pour la raison de rejet (optionnelle)
    let rejectionReason: string | undefined;
    try {
      const body = await request.json();
      rejectionReason = body.reason;
    } catch {
      // Pas de body ou body invalide, pas de raison fournie
    }

    // Marquer le praticien comme non vérifié pour permettre la re-soumission
    await prisma.practitioners.update({
      where: { id },
      data: {
        is_verified: false,
        is_active: false, // Désactiver également
      },
    });

    // Envoyer un email de rejet au praticien
    const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/pro/profile`;
    try {
      await sendPractitionerRejectionEmail({
        practitionerName: practitioner.users?.name || practitioner.title,
        practitionerEmail: practitioner.users?.email || "",
        rejectionReason: rejectionReason,
        profileUrl: profileUrl,
      });
    } catch (emailError) {
      console.error("Error sending practitioner rejection email:", emailError);
      // Ne pas faire échouer le rejet si l'email échoue
    }

    return NextResponse.json({ message: "Practitioner rejected" });
  } catch (error) {
    console.error("Error rejecting practitioner:", error);
    return NextResponse.json(
      { error: "Failed to reject practitioner" },
      { status: 500 }
    );
  }
}

