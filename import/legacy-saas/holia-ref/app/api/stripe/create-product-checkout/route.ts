import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

const schema = z.object({
  practitionerId: z.string().min(1),
  items: z.array(itemSchema).min(1).max(10),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { practitionerId, items } = schema.parse(body);

    const practitioner = await prisma.practitioners.findFirst({
      where: { id: practitionerId },
      select: {
        id: true,
        slug: true,
        stripe_account_id: true,
        stripe_onboarding_complete: true,
        subscription_status: true,
      },
    });

    if (!practitioner?.stripe_account_id || !practitioner.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Le praticien n'a pas configuré le paiement en ligne" },
        { status: 400 }
      );
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.products.findMany({
      where: {
        id: { in: productIds },
        practitioner_id: practitionerId,
        stock: { gt: 0 },
      },
    });

    const lineItems: { price_data: any; quantity: number }[] = [];
    const productMetadata: { id: string; qty: string }[] = [];
    let totalCents = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Produit ${product?.name || item.productId} indisponible ou stock insuffisant` },
          { status: 400 }
        );
      }

      const amount = product.price_cents * item.quantity;
      if (amount > 0) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: product.name,
              description: product.description || undefined,
              images: product.image_url
                ? [product.image_url.startsWith("http") ? product.image_url : `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}${product.image_url}`]
                : undefined,
            },
            unit_amount: product.price_cents,
          },
          quantity: item.quantity,
        });
        productMetadata.push({ id: product.id, qty: String(item.quantity) });
        totalCents += amount;
      }
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: "Aucun produit à payer" }, { status: 400 });
    }

    const isPremium = practitioner.subscription_status === "active";
    const applicationFeeAmount = isPremium ? 0 : Math.round(totalCents * 0.08);

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          metadata: {
            type: "products",
            practitionerId,
            patientId: session.user.id,
            productItems: JSON.stringify(productMetadata),
            isPremium: isPremium.toString(),
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}/praticien/${practitioner.slug}?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}/praticien/${practitioner.slug}?payment=canceled`,
        metadata: {
          type: "products",
          practitionerId,
          patientId: session.user.id,
          productItems: JSON.stringify(productMetadata),
        },
      },
      { stripeAccount: practitioner.stripe_account_id }
    );

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (error: any) {
    console.error("Product checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}
