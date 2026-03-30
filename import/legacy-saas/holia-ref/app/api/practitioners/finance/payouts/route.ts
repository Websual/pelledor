import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

function mapStripeStatus(status: string): string {
  switch (status) {
    case "pending":
      return "En attente";
    case "in_transit":
      return "En route";
    case "paid":
      return "Payé";
    case "failed":
      return "Échoué";
    case "canceled":
      return "Annulé";
    default:
      return status;
  }
}

/**
 * GET: Liste les virements Stripe Connect du praticien (temps réel)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { stripe_account_id: true },
    });

    if (!practitioner?.stripe_account_id) {
      return NextResponse.json({ payouts: [] });
    }

    const { data: payouts } = await stripe.payouts.list(
      { limit: 10 },
      { stripeAccount: practitioner.stripe_account_id }
    );

    const mapped = payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      arrival_date: p.arrival_date ? new Date(p.arrival_date * 1000).toISOString() : null,
      status: mapStripeStatus(p.status),
      created: p.created ? new Date(p.created * 1000).toISOString() : null,
    }));

    return NextResponse.json({ payouts: mapped });
  } catch (error) {
    console.error("[Payouts API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payouts" },
      { status: 500 }
    );
  }
}
