import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getServicePrice } from "@/lib/get-service-price";
import { z } from "zod";

const createBookingSessionSchema = z.object({
  appointmentId: z.string().min(1),
  serviceId: z.string().min(1),
  practitionerId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { appointmentId, serviceId, practitionerId } = createBookingSessionSchema.parse(body);

    // Récupérer le praticien et vérifier son statut Stripe
    const practitioner = await prisma.practitioners.findFirst({
      where: { id: practitionerId },
      include: { 
        services: { 
          where: { id: serviceId } 
        } 
      },
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    if (!practitioner.stripe_account_id || !practitioner.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Practitioner has not completed Stripe onboarding" },
        { status: 400 }
      );
    }

    const service = practitioner.services[0];
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Récupérer le rendez-vous
    const appointment = await prisma.appointments.findFirst({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Prix effectif (remisé si promo marketing active)
    const { priceCents: bookingAmount } = await getServicePrice(service);

    // Calculer la commission selon le modèle (Découverte = 8%, Essentiel = 0%)
    const isPremium = practitioner.subscription_status === "active";
    
    // Validation : s'assurer que le calcul de la commission ne peut pas échouer
    if (typeof bookingAmount !== 'number' || bookingAmount <= 0 || isNaN(bookingAmount)) {
      return NextResponse.json(
        { error: "Invalid booking amount" },
        { status: 400 }
      );
    }

    // Calculer l'application fee selon le plan
    // Plan DÉCOUVERTE (free) : 8% de commission
    // Plan ESSENTIEL (active) : 0% de commission
    const applicationFeeAmount = isPremium ? 0 : Math.round(bookingAmount * 0.08);
    
    // Validation de sécurité : bloquer si le calcul échoue
    if (isNaN(applicationFeeAmount) || applicationFeeAmount < 0) {
      console.error("Failed to calculate application fee", { bookingAmount, isPremium, applicationFeeAmount });
      return NextResponse.json(
        { error: "Failed to calculate commission. Transaction blocked for security." },
        { status: 500 }
      );
    }

    // Les frais de transaction Stripe (processing fees) seront automatiquement déduits
    // du montant transféré au compte connecté. Holia ne les absorbe jamais.
    // Frais Stripe approximatifs : 1.4% + 0.25€ (pour les cartes européennes)
    // Ces frais sont déduits du montant transféré, pas de l'application fee

    // Créer la session Checkout avec Direct Charges
    // Le paiement va directement sur le compte connecté du praticien
    // Holia prélève sa commission via application_fee_amount
    // Les frais Stripe sont à la charge du compte connecté (pas de Holia)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: service.name,
              description: service.description || undefined,
            },
            unit_amount: bookingAmount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        metadata: {
          appointmentId,
          practitionerId,
          serviceId,
          patientId: session.user.id,
          isPremium: isPremium.toString(),
          applicationFeeAmount: applicationFeeAmount.toString(),
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/account/appointments?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/account/appointments?payment=canceled`,
      metadata: {
        appointmentId,
        practitionerId,
        serviceId,
        patientId: session.user.id,
      },
    }, {
      // Direct Charges : utiliser stripeAccount pour que le paiement aille directement sur le compte connecté
      stripeAccount: practitioner.stripe_account_id,
    });

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (error: any) {
    console.error("Stripe booking session error:", error);
    return NextResponse.json(
      { error: "Failed to create booking session", details: error.message },
      { status: 500 }
    );
  }
}

