import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getServicePrice } from "@/lib/get-service-price";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";

const productItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(5),
});

const createCheckoutSchema = z.object({
  serviceId: z.string().min(1),
  practitionerId: z.string().min(1),
  startsAt: z.string().datetime(),
  locationType: z.enum(["PRESENTIAL", "VIDEO"]).optional(),
  locationChoice: z.enum(["PRESENTIAL", "VIDEO"]).optional(),
  productItems: z.array(productItemSchema).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createCheckoutSchema.parse(body);
    const { serviceId, practitionerId, startsAt, productItems = [] } = parsed;
    // Utiliser locationType en priorité, sinon locationChoice pour compatibilité
    const locationChoice = parsed.locationType || parsed.locationChoice;

    // Récupérer le praticien et vérifier son statut Stripe et auto_accept_appointments
    const practitioner = await prisma.practitioners.findFirst({
      where: { id: practitionerId },
      include: { 
        services: { 
          where: { id: serviceId },
        },
        products: productItems.length > 0
          ? { where: { id: { in: productItems.map((p) => p.productId) } } }
          : false,
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    const service = (practitioner as any).services?.[0];
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Vérifier que le choix de localisation est valide pour le service
    const serviceLocationType = service.location_type;
    if (serviceLocationType === "PRESENTIAL_ONLY" && locationChoice !== "PRESENTIAL") {
      return NextResponse.json(
        { error: "Ce service n'est disponible qu'en cabinet" },
        { status: 400 }
      );
    }
    if (serviceLocationType === "VIDEO_ONLY" && locationChoice !== "VIDEO") {
      return NextResponse.json(
        { error: "Ce service n'est disponible qu'en visio" },
        { status: 400 }
      );
    }
    if (serviceLocationType === "HYBRID" && !locationChoice) {
      return NextResponse.json(
        { error: "Veuillez choisir le type de séance (cabinet ou visio)" },
        { status: 400 }
      );
    }

    if (!practitioner.stripe_account_id || !practitioner.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Ce praticien n'a pas encore configuré le paiement en ligne" },
        { status: 400 }
      );
    }


    // Vérifier les chevauchements de créneaux
    const appointmentStart = new Date(startsAt);
    const appointmentEnd = new Date(appointmentStart);
    appointmentEnd.setMinutes(appointmentEnd.getMinutes() + service.duration_min);

    const existingAppointments = await prisma.appointments.findMany({
      where: {
        practitioner_id: practitionerId,
        status: {
          in: ["CONFIRMED", "PENDING"],
        },
        starts_at: {
          gte: new Date(appointmentStart.getTime() - service.duration_min * 60000),
          lte: appointmentEnd,
        },
      },
      include: {
        services: true,
      },
    });

    const hasOverlap = existingAppointments.some((appointment) => {
      const existingStart = new Date(appointment.starts_at);
      const existingEnd = new Date(existingStart);
      existingEnd.setMinutes(existingEnd.getMinutes() + appointment.services.duration_min);

      return (
        (appointmentStart >= existingStart && appointmentStart < existingEnd) ||
        (appointmentEnd > existingStart && appointmentEnd <= existingEnd) ||
        (appointmentStart <= existingStart && appointmentEnd >= existingEnd)
      );
    });

    if (hasOverlap) {
      return NextResponse.json(
        { error: "Ce créneau n'est plus disponible" },
        { status: 400 }
      );
    }

    // Déterminer le statut : CONFIRMED si auto_accept_appointments est activé, sinon PENDING
    // Le statut sera mis à jour en CONFIRMED après paiement dans le webhook si nécessaire
    const appointmentStatus = practitioner.auto_accept_appointments ? "CONFIRMED" : "PENDING";
    
    // Déterminer le choix de localisation pour l'appointment
    let appointmentLocationChoice: "PRESENTIAL" | "VIDEO" | null = null;
    if (serviceLocationType === "VIDEO_ONLY") {
      appointmentLocationChoice = "VIDEO";
    } else if (serviceLocationType === "PRESENTIAL_ONLY") {
      appointmentLocationChoice = "PRESENTIAL";
    } else if (serviceLocationType === "HYBRID" && locationChoice) {
      appointmentLocationChoice = locationChoice;
    }

    // Créer le rendez-vous
    const appointmentId = createId();
    await prisma.appointments.create({
      data: {
        id: appointmentId,
        user_id: session.user.id,
        practitioner_id: practitionerId,
        service_id: serviceId,
        starts_at: appointmentStart,
        status: appointmentStatus,
        location_choice: appointmentLocationChoice,
        updated_at: new Date(),
      } as any,
    });

    // Prix effectif du service (remisé si promo marketing active)
    const { priceCents: servicePriceCents } = await getServicePrice(service);

    // Calculer la commission selon le plan
    const isPremium = practitioner.subscription_status === "active";
    let totalAmount = servicePriceCents;
    const lineItems: { price_data: any; quantity: number }[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: service.name,
            description: service.description || undefined,
          },
          unit_amount: servicePriceCents,
        },
        quantity: 1,
      },
    ];

    const productMetadata: { id: string; qty: string }[] = [];
    if (productItems.length > 0 && practitioner.products) {
      const prods = practitioner.products as any[];
      for (const item of productItems) {
        const product = prods.find((p: any) => p.id === item.productId);
        if (!product || product.stock < item.quantity) {
          return NextResponse.json(
            { error: `Produit ${product?.name || item.productId} indisponible` },
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
          totalAmount += amount;
        }
      }
    }

    if (typeof totalAmount !== "number" || totalAmount <= 0 || isNaN(totalAmount)) {
      return NextResponse.json({ error: "Invalid booking amount" }, { status: 400 });
    }

    const applicationFeeAmount = isPremium ? 0 : Math.round(totalAmount * 0.08);

    if (isNaN(applicationFeeAmount) || applicationFeeAmount < 0) {
      return NextResponse.json(
        { error: "Failed to calculate commission. Transaction blocked for security." },
        { status: 500 }
      );
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        metadata: {
          appointmentId,
          practitionerId,
          serviceId,
          patientId: session.user.id,
          isPremium: isPremium.toString(),
          applicationFeeAmount: applicationFeeAmount.toString(),
          ...(productMetadata.length > 0 && {
            productItems: JSON.stringify(productMetadata),
          }),
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/account/appointments?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/praticien/${practitioner.slug}?payment=canceled`,
      metadata: {
        appointmentId,
        practitionerId,
        serviceId,
        patientId: session.user.id,
        ...(productMetadata.length > 0 && { productItems: JSON.stringify(productMetadata) }),
      },
    }, {
      // Direct Charges : utiliser stripeAccount pour que le paiement aille directement sur le compte connecté
      stripeAccount: practitioner.stripe_account_id,
    });

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session", details: error.message },
      { status: 500 }
    );
  }
}
