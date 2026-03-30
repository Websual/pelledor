import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";



export async function GET(req: NextRequest) {
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

    if (!practitioner || !practitioner.stripe_account_id) {
      return NextResponse.json({
        complete: false,
        canAcceptPayments: false,
        detailsSubmitted: false,
      });
    }

    // Vérifier le statut du compte Stripe
    const account = await stripe.accounts.retrieve(practitioner.stripe_account_id);

    const isComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    // Mettre à jour le statut dans la base de données
    if (isComplete !== practitioner.stripe_onboarding_complete) {
      await prisma.practitioners.update({
        where: { id: practitioner.id },
        data: { stripe_onboarding_complete: isComplete },
      });
    }

    return NextResponse.json({
      complete: isComplete,
      canAcceptPayments: account.charges_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      payoutsEnabled: account.payouts_enabled || false,
    });
  } catch (error: any) {
    console.error("Stripe onboarding status error:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status", details: error.message },
      { status: 500 }
    );
  }
}


