import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";



export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer le praticien
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    let customerId = practitioner.stripe_customer_id;

    // Créer ou récupérer le customer Stripe
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        metadata: {
          practitionerId: practitioner.id,
          userId: session.user.id,
        },
      });

      customerId = customer.id;

      // Sauvegarder l'ID du customer
      await prisma.practitioners.update({
        where: { id: practitioner.id },
        data: { stripe_customer_id: customerId },
      });
    }

    // Récupérer le price ID depuis les variables d'environnement ou le produit
    let priceId = process.env.STRIPE_PREMIUM_PRICE_ID;

    // Si pas de price_id configuré, récupérer le premier prix actif du produit Premium
    if (!priceId) {
      const productId = process.env.STRIPE_PREMIUM_PRODUCT_ID || "prod_TWuou1VBxq0irx";
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 1,
      });

      if (prices.data.length === 0) {
        return NextResponse.json(
          { error: "No active price found for Premium product" },
          { status: 500 }
        );
      }

      priceId = prices.data[0].id;
    }

    // Créer la session Checkout pour l'abonnement
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/pro/settings?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/pro/settings?subscription=canceled`,
      metadata: {
        practitionerId: practitioner.id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Stripe subscription session error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription session", details: error.message },
      { status: 500 }
    );
  }
}

