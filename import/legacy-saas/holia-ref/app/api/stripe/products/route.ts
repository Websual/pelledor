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

    // Récupérer le produit Premium depuis l'env ou utiliser l'ID fourni
    const productId = process.env.STRIPE_PREMIUM_PRODUCT_ID || "prod_TWuou1VBxq0irx";

    // Récupérer le produit et ses prix
    const product = await stripe.products.retrieve(productId);
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
      },
      prices: prices.data.map((price) => ({
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        intervalCount: price.recurring?.interval_count,
      })),
    });
  } catch (error: any) {
    console.error("Stripe products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products", details: error.message },
      { status: 500 }
    );
  }
}


