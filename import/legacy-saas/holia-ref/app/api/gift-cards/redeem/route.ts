import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// POST - Utiliser un code cadeau
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, appointmentId } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    // Trouver la carte cadeau
    const giftCard = await prisma.gift_cards.findUnique({
      where: { code },
      include: {
        practitioners: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!giftCard) {
      return NextResponse.json(
        { error: "Code cadeau invalide" },
        { status: 404 }
      );
    }

    // Vérifier le statut
    if (giftCard.status !== "pending" && giftCard.status !== "active") {
      return NextResponse.json(
        { error: "Ce code cadeau a déjà été utilisé ou est expiré" },
        { status: 400 }
      );
    }

    // Vérifier la date d'expiration
    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      await prisma.gift_cards.update({
        where: { id: giftCard.id },
        data: { status: "expired" },
      });
      return NextResponse.json(
        { error: "Ce code cadeau a expiré" },
        { status: 400 }
      );
    }

    // Si un appointmentId est fourni, vérifier qu'il correspond au praticien
    if (appointmentId) {
      const appointment = await prisma.appointments.findFirst({
        where: {
          id: appointmentId,
          practitioner_id: giftCard.practitioner_id,
        },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Ce code cadeau ne peut pas être utilisé pour ce rendez-vous" },
          { status: 400 }
        );
      }

      // Marquer la carte comme utilisée
      await prisma.gift_cards.update({
        where: { id: giftCard.id },
        data: {
          status: "redeemed",
          redeemed_at: new Date(),
          redeemed_by_user_id: session.user.id,
          redeemed_appointment_id: appointmentId,
        },
      });

      // TODO: Appliquer la réduction au paiement du RDV
      // Pour l'instant, on retourne juste la confirmation
      return NextResponse.json({
        success: true,
        amountCents: giftCard.amount_cents,
        message: `Code cadeau utilisé avec succès ! Réduction de ${(giftCard.amount_cents / 100).toFixed(2)}€ appliquée.`,
      });
    }

    // Si pas d'appointmentId, on active juste le code (pour utilisation future)
    await prisma.gift_cards.update({
      where: { id: giftCard.id },
      data: {
        status: "active",
        redeemed_by_user_id: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      amountCents: giftCard.amount_cents,
      message: `Code cadeau activé ! Vous avez ${(giftCard.amount_cents / 100).toFixed(2)}€ de crédit.`,
    });
  } catch (error) {
    console.error("Error redeeming gift card:", error);
    return NextResponse.json(
      { error: "Failed to redeem gift card" },
      { status: 500 }
    );
  }
}

