import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET - Générer le PDF d'une carte cadeau
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const giftCard = await prisma.gift_cards.findUnique({
      where: { id },
      include: {
        practitioners: {
          select: {
            title: true,
            users: {
              select: {
                name: true,
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

    if (!giftCard) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
    }

    // Vérifier les permissions (acheteur ou praticien)
    const isBuyer = giftCard.buyer_user_id === session.user.id;
    const isPractitioner = session.user.role === "PRACTITIONER";
    
    if (!isBuyer && !isPractitioner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // TODO: Générer le PDF avec une bibliothèque comme pdfkit ou react-pdf
    // Pour l'instant, on retourne les données pour génération côté client
    // ou on génère un HTML qui peut être imprimé en PDF

    const pdfData = {
      code: giftCard.code,
      amount: (giftCard.amount_cents / 100).toFixed(2),
      practitioner: giftCard.practitioners.title,
      recipientName: giftCard.recipient_name || giftCard.recipient_email || "Bénéficiaire",
      message: giftCard.message,
      expiresAt: giftCard.expires_at ? new Date(giftCard.expires_at).toLocaleDateString("fr-FR") : null,
      purchasedAt: new Date(giftCard.purchased_at).toLocaleDateString("fr-FR"),
    };

    // Pour l'instant, on retourne les données JSON
    // Le frontend pourra générer le PDF avec react-pdf ou une autre lib
    return NextResponse.json(pdfData);
  } catch (error) {
    console.error("Error generating gift card PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

