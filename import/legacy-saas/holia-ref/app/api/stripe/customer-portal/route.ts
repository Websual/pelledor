import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3005";

/**
 * POST: Créer une session Stripe Customer Portal
 * Permet au praticien de gérer son abonnement (CB, annulation) sur l’interface sécurisée Stripe.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true, stripe_customer_id: true },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    if (!practitioner.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "Aucun compte Stripe associé. Activez d’abord les paiements en ligne.",
        },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: practitioner.stripe_customer_id,
      return_url: `${baseUrl}/pro/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: unknown) {
    console.error("Stripe customer portal session error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Impossible de créer la session du portail", details: message },
      { status: 500 }
    );
  }
}
