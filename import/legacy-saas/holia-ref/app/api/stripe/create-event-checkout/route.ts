import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { sendPatientEventTicketEmail, sendPractitionerEventRegistrationEmail } from "@/lib/emails";

const schema = z.object({
  eventId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, quantity } = schema.parse(body);

    const event = await prisma.events.findFirst({
      where: { id: eventId },
      include: {
        practitioners: {
          select: {
            id: true,
            slug: true,
            stripe_account_id: true,
            stripe_onboarding_complete: true,
            subscription_status: true,
          },
        },
      },
    });

    if (!event || !event.practitioners) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.remaining_places < quantity) {
      return NextResponse.json(
        { error: "Plus assez de places disponibles" },
        { status: 400 }
      );
    }

    const practitioner = event.practitioners;
    if (!practitioner.stripe_account_id || !practitioner.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Le praticien n'a pas configuré le paiement en ligne" },
        { status: 400 }
      );
    }

    const totalCents = event.price_cents * quantity;
    const isPremium = practitioner.subscription_status === "active";

    if (totalCents <= 0) {
      const ticketId = createId();
      await prisma.tickets.create({
        data: {
          id: ticketId,
          event_id: eventId,
          user_id: session.user.id,
          quantity,
          status: "confirmed",
        },
      });
      const updatedEvent = await prisma.events.update({
        where: { id: eventId },
        data: {
          remaining_places: { decrement: quantity },
          updated_at: new Date(),
        },
        include: {
          practitioners: {
            select: {
              title: true,
              address: true,
              location_city: true,
              users: { select: { email: true } },
            },
          },
        },
      });
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://holia.me";
      const receiptUrl = `${baseUrl}/api/tickets/${ticketId}/receipt`;
      const eventsUrl = `${baseUrl}/pro/events`;
      const eventAddress =
        updatedEvent.address ||
        (updatedEvent.practitioners as any)?.address ||
        (updatedEvent.practitioners as any)?.location_city ||
        null;
      const userName = session.user?.name || "Client";
      const userEmail = session.user?.email;

      try {
        if (userEmail) {
          await sendPatientEventTicketEmail({
            userName,
            userEmail,
            eventTitle: updatedEvent.title,
            eventDate: updatedEvent.date,
            eventAddress,
            receiptUrl,
          });
        }
      } catch (e) {
        console.error("Error sending patient event ticket email:", e);
      }

      try {
        const practitionerEmail = (updatedEvent.practitioners as any)?.users?.email;
        if (practitionerEmail) {
          await sendPractitionerEventRegistrationEmail({
            practitionerName: (updatedEvent.practitioners as any)?.title || "Praticien",
            practitionerEmail,
            eventTitle: updatedEvent.title,
            participantName: userName,
            remainingPlaces: updatedEvent.remaining_places,
            eventsUrl,
          });
        }
      } catch (e) {
        console.error("Error sending practitioner event registration email:", e);
      }

      return NextResponse.json({
        url: `${baseUrl}/account/events?payment=success`,
        sessionId: null,
      });
    }

    const applicationFeeAmount = isPremium ? 0 : Math.round(totalCents * 0.08);
    const minParticipants = event.min_participants ?? 1;
    const useManualCapture = minParticipants > 1;

    const ticketId = createId();

    const paymentIntentData: Record<string, unknown> = {
      application_fee_amount: applicationFeeAmount,
      metadata: {
            eventId,
            ticketId,
            practitionerId: practitioner.id,
            patientId: session.user.id,
            quantity: quantity.toString(),
            isPremium: isPremium.toString(),
          },
    };
    if (useManualCapture) {
      paymentIntentData.capture_method = "manual";
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: event.title,
                description: event.description || undefined,
                images: (() => {
                  const imgUrl = event.banner_url || (event.poster_url && !event.poster_url.toLowerCase().endsWith(".pdf") ? event.poster_url : null);
                  return imgUrl ? [imgUrl.startsWith("http") ? imgUrl : `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}${imgUrl}`] : undefined;
                })(),
              },
              unit_amount: event.price_cents,
            },
            quantity,
          },
        ],
        payment_intent_data: paymentIntentData as any,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}/account/events?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}/evenements?payment=canceled`,
        metadata: {
          eventId,
          ticketId,
          practitionerId: practitioner.id,
          patientId: session.user.id,
          quantity: quantity.toString(),
        },
      },
      { stripeAccount: practitioner.stripe_account_id }
    );

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (error: any) {
    console.error("Event checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}
