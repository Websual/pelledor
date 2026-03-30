import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";



/**
 * POST: Créer une session Stripe Customer Portal
 * Permet au praticien de gérer son abonnement et télécharger ses factures
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: {
        id: true,
        stripe_customer_id: true,
        subscription_status: true,
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    if (!practitioner.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer ID found. Please activate online payments first." },
        { status: 400 }
      );
    }

    // Créer la session du portail client Stripe
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: practitioner.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/pro/finance?tab=subscription`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("Error creating Stripe portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session", details: error.message },
      { status: 500 }
    );
  }
}

