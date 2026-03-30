import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const KYC_ERROR_MESSAGE =
  "Votre compte Stripe n'est pas encore prêt pour les virements. Veuillez vérifier vos informations sur Stripe.";

/**
 * POST: Initie un virement vers le compte bancaire du praticien (solde disponible Stripe).
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true, stripe_account_id: true },
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    if (!practitioner.stripe_account_id) {
      return NextResponse.json(
        { error: "Aucun compte Stripe Connect configuré." },
        { status: 400 }
      );
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: practitioner.stripe_account_id,
    });

    const availableCents = balance.available?.[0]?.amount ?? 0;

    if (availableCents <= 0) {
      return NextResponse.json(
        { error: "Solde disponible insuffisant pour effectuer un virement." },
        { status: 400 }
      );
    }

    const payout = await stripe.payouts.create(
      {
        amount: availableCents,
        currency: "eur",
      },
      { stripeAccount: practitioner.stripe_account_id }
    );

    return NextResponse.json({
      success: true,
      amountCents: payout.amount,
      payoutId: payout.id,
    });
  } catch (error: unknown) {
    const err = error as { type?: string; code?: string; message?: string };
    console.error("[Payout API] Error:", err);

    if (err.type === "StripeInvalidRequestError" || err.code === "account_invalid") {
      return NextResponse.json(
        { error: KYC_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    const msg = String(err.message || "").toLowerCase();
    if (
      msg.includes("account") ||
      msg.includes("verification") ||
      msg.includes("kyc") ||
      msg.includes("external_account")
    ) {
      return NextResponse.json(
        { error: KYC_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Erreur lors du virement" },
      { status: 500 }
    );
  }
}
