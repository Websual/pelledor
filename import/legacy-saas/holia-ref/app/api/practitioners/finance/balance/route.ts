import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * GET: Récupère le solde Stripe Connect (available + pending) et le mode de virement.
 */
export async function GET() {
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
      return NextResponse.json({
        available: 0,
        pending: 0,
        currency: "eur",
        automaticPayouts: false,
      });
    }

    const [balance, account] = await Promise.all([
      stripe.balance.retrieve({
        stripeAccount: practitioner.stripe_account_id,
      }),
      stripe.accounts.retrieve(practitioner.stripe_account_id).catch(() => null),
    ]);

    const eurAvailable = balance.available?.find((b) => b.currency === "eur");
    const eurPending = balance.pending?.find((b) => b.currency === "eur");

    const available = eurAvailable?.amount ?? 0;
    const pending = eurPending?.amount ?? 0;

    let automaticPayouts = false;
    if (account && "settings" in account && account.settings?.payouts?.schedule) {
      const schedule = account.settings.payouts.schedule as { interval?: string };
      automaticPayouts = schedule.interval !== "manual" && !!schedule.interval;
    } else {
      // Par défaut, la plupart des comptes Connect ont des virements auto
      automaticPayouts = true;
    }

    return NextResponse.json({
      available,
      pending,
      currency: "eur",
      automaticPayouts,
    });
  } catch (error) {
    console.error("[Balance API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
