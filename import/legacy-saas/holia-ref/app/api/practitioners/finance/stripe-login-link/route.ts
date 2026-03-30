import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * GET: Génère un lien de connexion au tableau de bord Stripe (gestion des coordonnées bancaires).
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
      return NextResponse.json(
        { error: "Aucun compte Stripe Connect configuré." },
        { status: 400 }
      );
    }

    const loginLink = await stripe.accounts.createLoginLink(
      practitioner.stripe_account_id
    );

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error("[Stripe Login Link] Error:", error);
    return NextResponse.json(
      { error: "Impossible de générer le lien Stripe." },
      { status: 500 }
    );
  }
}
