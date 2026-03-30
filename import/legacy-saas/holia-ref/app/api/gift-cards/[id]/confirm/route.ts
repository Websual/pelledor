import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";



// POST - Confirmer le paiement d'une carte cadeau (appelé par webhook Stripe)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Vérifier la session Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Lier la session Stripe à cette carte cadeau (éviter d'activer une autre carte avec ce paiement)
    const sessionGiftCardId =
      stripeSession.metadata?.giftCardId ??
      (stripeSession as { client_reference_id?: string }).client_reference_id;
    if (sessionGiftCardId !== id) {
      return NextResponse.json(
        { error: "Session does not match this gift card" },
        { status: 400 }
      );
    }

    // Mettre à jour la carte cadeau
    const giftCard = await prisma.gift_cards.update({
      where: { id },
      data: {
        status: "active", // Active après paiement
      },
      include: {
        practitioners: {
          select: {
            title: true,
            users: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // TODO: Envoyer un email au bénéficiaire si email fourni
    // TODO: Générer le PDF et le stocker

    return NextResponse.json({ success: true, giftCard });
  } catch (error) {
    console.error("Error confirming gift card payment:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}

