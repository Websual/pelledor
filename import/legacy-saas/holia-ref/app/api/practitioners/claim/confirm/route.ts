import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    console.log('[API Claim Confirm] Starting claim confirmation...');

    // Vérifier la session utilisateur
    const session = await getServerSession(authOptions);
    console.log('[API Claim Confirm] Session:', { userId: session?.user?.id, email: session?.user?.email });

    if (!session?.user?.id) {
      console.log('[API Claim Confirm] No authenticated user');
      return NextResponse.json(
        { error: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    const { claimId } = await request.json();
    console.log('[API Claim Confirm] Claim data:', { claimId, userId: session.user.id });

    if (!claimId) {
      return NextResponse.json(
        { error: "ID de réclamation manquant" },
        { status: 400 }
      );
    }

    console.log(`[API Claim Confirm] Processing claim confirmation for user ${session.user.id}, practitioner ${claimId}`);

    // Vérifier que le praticien existe et n'est pas déjà réclamé
    console.log('[API Claim Confirm] Checking practitioner:', claimId);
    const practitioner = await prisma.practitioners.findUnique({
      where: { id: claimId },
    });

    console.log('[API Claim Confirm] Practitioner found:', {
      exists: !!practitioner,
      is_claimed: practitioner?.is_claimed,
      title: practitioner?.title
    });

    if (!practitioner) {
      console.log('[API Claim Confirm] Practitioner not found');
      return NextResponse.json(
        { error: "Praticien introuvable" },
        { status: 404 }
      );
    }

    if (practitioner.is_claimed) {
      console.log('[API Claim Confirm] Practitioner already claimed');
      return NextResponse.json(
        { error: "Ce profil a déjà été réclamé" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur n'a pas déjà un profil praticien
    const existingPractitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (existingPractitioner) {
      console.log('[API Claim Confirm] User already has a practitioner profile');
      return NextResponse.json(
        { error: "Vous avez déjà un profil praticien" },
        { status: 400 }
      );
    }

    // Exécuter la transaction : lier le praticien à l'utilisateur et changer son rôle
    console.log('[API Claim Confirm] Starting transaction...');
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lier l'utilisateur au praticien
      const updatedPractitioner = await tx.practitioners.update({
        where: { id: claimId },
        data: {
          user_id: session.user.id,
          is_claimed: true,
          is_verified: false,
          is_active: true,
          updated_at: new Date()
        },
      });

      // 2. Changer le rôle de l'utilisateur
      const updatedUser = await tx.users.update({
        where: { id: session.user.id },
        data: {
          role: "PRACTITIONER",
          updated_at: new Date()
        },
      });

      return { updatedPractitioner, updatedUser };
    });

    console.log('[API Claim Confirm] Transaction successful:', {
      practitionerId: result.updatedPractitioner.id,
      userId: result.updatedUser.id,
      newRole: result.updatedUser.role
    });

    return NextResponse.json({
      success: true,
      message: "Profil réclamé avec succès",
      practitioner: {
        id: result.updatedPractitioner.id,
        title: result.updatedPractitioner.title,
        location_city: result.updatedPractitioner.location_city
      }
    });

  } catch (error) {
    console.error("[API Claim Confirm] Error:", error);
    console.error("[API Claim Confirm] Stack:", error.stack);
    return NextResponse.json(
      { error: "Erreur interne du serveur", details: error.message },
      { status: 500 }
    );
  }
}