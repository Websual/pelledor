import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { createId } from "@paralleldrive/cuid2";




// GET - Liste des cartes cadeaux (praticien ou admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const practitionerId = searchParams.get("practitionerId");

    const where: any = {};
    if (practitionerId) {
      where.practitioner_id = practitionerId;
    } else if (session.user.role === "PRACTITIONER") {
      // Praticien voit seulement ses cartes
      const practitioner = await prisma.practitioners.findFirst({
        where: { user_id: session.user.id },
      });
      if (!practitioner) {
        return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
      }
      where.practitioner_id = practitioner.id;
    }

    const giftCards = await prisma.gift_cards.findMany({
      where,
      include: {
        practitioners: {
          select: {
            id: true,
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
            id: true,
            name: true,
            email: true,
          },
        },
        redeemed_by: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { purchased_at: "desc" },
    });

    return NextResponse.json(giftCards);
  } catch (error) {
    console.error("Error fetching gift cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch gift cards" },
      { status: 500 }
    );
  }
}

// POST - Créer/acheter une carte cadeau
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { practitionerId, amountCents, recipientEmail, recipientName, message } = body;

    if (!practitionerId || !amountCents || amountCents < 100) {
      return NextResponse.json(
        { error: "Invalid parameters. Minimum amount is 1€" },
        { status: 400 }
      );
    }

    // Vérifier que le praticien existe et récupérer son plan d'abonnement
    const practitioner = await prisma.practitioners.findFirst({
      where: { id: practitionerId },
      select: {
        id: true,
        title: true,
        subscription_status: true,
        stripe_account_id: true,
        stripe_onboarding_complete: true,
        accepts_gift_cards: true,
      },
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    // Vérifier que le praticien accepte les cartes cadeaux
    if (!practitioner.accepts_gift_cards) {
      return NextResponse.json(
        { error: "Ce praticien n'accepte pas les cartes cadeaux" },
        { status: 400 }
      );
    }

    // Vérifier que le praticien a un compte Stripe Connect configuré
    if (!practitioner.stripe_account_id || !practitioner.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Le praticien n'a pas configuré son compte de paiement" },
        { status: 400 }
      );
    }

    // Déterminer le plan : 'free' (Découverte) ou 'active' (Essentiel)
    // subscription_status peut être 'free', 'active', 'past_due', 'canceled'
    const isPremium = practitioner.subscription_status === "active";
    
    // Validation : s'assurer que le montant est valide
    if (typeof amountCents !== 'number' || amountCents <= 0 || isNaN(amountCents)) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }
    
    // Calculer la commission selon le plan
    // Plan DÉCOUVERTE (free) : 8% de commission
    // Plan ESSENTIEL (active) : 0% de commission
    const applicationFeeAmount = isPremium ? 0 : Math.round(amountCents * 0.08);
    
    // Validation de sécurité : bloquer si le calcul échoue
    if (isNaN(applicationFeeAmount) || applicationFeeAmount < 0) {
      console.error("Failed to calculate application fee for gift card", { 
        amountCents, 
        isPremium, 
        applicationFeeAmount,
        subscription_status: practitioner.subscription_status 
      });
      return NextResponse.json(
        { error: "Failed to calculate commission. Transaction blocked for security." },
        { status: 500 }
      );
    }

    // Les frais de transaction Stripe (processing fees) seront automatiquement déduits
    // du montant transféré au compte connecté. Holia ne les absorbe jamais.
    // Frais Stripe approximatifs : 1.4% + 0.25€ (pour les cartes européennes)
    // Ces frais sont déduits du montant transféré, pas de l'application fee

    // Générer un code unique
    const code = `HOLIA-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Créer la carte cadeau
    const giftCard = await prisma.gift_cards.create({
      data: {
        id: createId(),
        code,
        practitioner_id: practitionerId,
        buyer_user_id: session.user.id,
        recipient_email: recipientEmail || null,
        recipient_name: recipientName || null,
        amount_cents: amountCents,
        status: "pending", // Sera mis à "active" après paiement
        message: message || null,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an
      },
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
      },
    });

    // Créer une session Checkout Stripe avec Stripe Connect et application fee
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Carte cadeau - ${practitioner.title}`,
              description: `Bon cadeau de ${(amountCents / 100).toFixed(2)}€ pour ${practitioner.title}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: practitioner.stripe_account_id,
        },
        metadata: {
          giftCardId: giftCard.id,
          practitionerId,
          buyerUserId: session.user.id,
          isPremium: isPremium.toString(),
          applicationFeeAmount: applicationFeeAmount.toString(),
          netAmount: (amountCents - applicationFeeAmount).toString(),
        },
      },
      metadata: {
        giftCardId: giftCard.id,
        practitionerId,
        buyerUserId: session.user.id,
        isPremium: isPremium.toString(),
        applicationFeeAmount: applicationFeeAmount.toString(),
        netAmount: (amountCents - applicationFeeAmount).toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/gift-cards/${giftCard.id}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/gift-cards/new?practitionerId=${practitionerId}&canceled=true`,
    });

    return NextResponse.json({
      giftCard,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Error creating gift card:", error);
    return NextResponse.json(
      { error: "Failed to create gift card" },
      { status: 500 }
    );
  }
}

