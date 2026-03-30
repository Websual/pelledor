"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendEventCancellationRefundEmail } from "@/lib/emails";
import { captureEventPayments, releaseEventPayments } from "@/lib/event-capture";

export async function cancelEvent(eventId: string): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return { success: false, error: "Non autorisé" };
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true, stripe_account_id: true },
    });
    if (!practitioner) {
      return { success: false, error: "Praticien introuvable" };
    }

    const event = await prisma.events.findFirst({
      where: {
        id: eventId,
        practitioner_id: practitioner.id,
      },
      include: {
        practitioners: {
          select: {
            stripe_account_id: true,
          },
        },
      },
    });

    if (!event) {
      return { success: false, error: "Événement introuvable ou accès refusé" };
    }

    if (event.status === "canceled") {
      return { success: false, error: "Cet événement est déjà annulé" };
    }

    const paidTickets = await prisma.tickets.findMany({
      where: {
        event_id: eventId,
        status: "confirmed",
      },
      include: {
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const offlineTickets = await prisma.tickets.findMany({
      where: {
        event_id: eventId,
        status: "payment_pending_offline",
      },
    });

    const reservedHoldTickets = await prisma.tickets.findMany({
      where: {
        event_id: eventId,
        status: "reserved_hold",
        stripe_payment_intent_id: { not: null },
      },
    });

    const stripeAccountId = event.practitioners?.stripe_account_id;

    for (const ticket of reservedHoldTickets) {
      if (ticket.stripe_payment_intent_id && stripeAccountId) {
        try {
          await stripe.paymentIntents.cancel(
            ticket.stripe_payment_intent_id,
            { stripeAccount: stripeAccountId }
          );
        } catch (stripeErr: unknown) {
          console.error(
            `[cancelEvent] Stripe cancel failed for reserved_hold ticket ${ticket.id}:`,
            stripeErr
          );
        }
      }
      await prisma.tickets.update({
        where: { id: ticket.id },
        data: { status: "canceled" },
      });
    }

    for (const ticket of paidTickets) {
      if (ticket.stripe_payment_intent_id && stripeAccountId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            ticket.stripe_payment_intent_id,
            { stripeAccount: stripeAccountId }
          );
          const chargeId =
            typeof paymentIntent.latest_charge === "string"
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge?.id;

          if (chargeId) {
            await stripe.refunds.create(
              {
                charge: chargeId,
                reason: "requested_by_customer",
              },
              { stripeAccount: stripeAccountId }
            );
          }
        } catch (stripeErr: any) {
          console.error(
            `[cancelEvent] Stripe refund failed for ticket ${ticket.id}:`,
            stripeErr?.message
          );
          return {
            success: false,
            error:
              stripeErr?.message || "Erreur lors du remboursement Stripe",
          };
        }
      }

      await prisma.tickets.update({
        where: { id: ticket.id },
        data: { status: "refunded" },
      });

      const refundAmountCents = ticket.amount_cents ?? 0;
      if (ticket.users?.email && refundAmountCents >= 0) {
        try {
          await sendEventCancellationRefundEmail({
            userName: ticket.users.name || "Participant",
            userEmail: ticket.users.email,
            eventTitle: event.title,
            eventDate: event.date,
            refundAmountCents,
          });
        } catch (emailErr) {
          console.error(
            `[cancelEvent] Email failed for ticket ${ticket.id}:`,
            emailErr
          );
        }
      }
    }

    for (const ticket of offlineTickets) {
      await prisma.tickets.update({
        where: { id: ticket.id },
        data: { status: "canceled" },
      });
    }

    const totalQuantity =
      paidTickets.reduce((sum, t) => sum + t.quantity, 0) +
      offlineTickets.reduce((sum, t) => sum + t.quantity, 0) +
      reservedHoldTickets.reduce((sum, t) => sum + t.quantity, 0);
    await prisma.events.update({
      where: { id: eventId },
      data: {
        status: "canceled",
        remaining_places: { increment: totalQuantity },
        updated_at: new Date(),
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("[cancelEvent] Error:", err);
    return {
      success: false,
      error: err?.message || "Erreur lors de l'annulation",
    };
  }
}

/**
 * Confirme l'événement et capture les paiements des tickets reserved_hold.
 * Vérifie que min_participants est atteint avant de capturer.
 */
export async function confirmAndCaptureEvent(eventId: string): Promise<
  | { success: true; capturedCount: number }
  | { success: false; error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return { success: false, error: "Non autorisé" };
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true },
    });
    if (!practitioner) {
      return { success: false, error: "Praticien introuvable" };
    }

    const event = await prisma.events.findFirst({
      where: { id: eventId, practitioner_id: practitioner.id },
    });
    if (!event) {
      return { success: false, error: "Événement introuvable ou accès refusé" };
    }

    if (event.confirmation_status === "CONFIRMED") {
      return { success: false, error: "L'événement est déjà confirmé" };
    }

    return captureEventPayments(eventId);
  } catch (err: unknown) {
    console.error("[confirmAndCaptureEvent] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la confirmation",
    };
  }
}

/**
 * Annule l'événement et libère les fonds des tickets reserved_hold (sans capture, sans frais).
 */
export async function cancelAndReleaseEvent(eventId: string): Promise<
  | { success: true; releasedCount: number }
  | { success: false; error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return { success: false, error: "Non autorisé" };
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true },
    });
    if (!practitioner) {
      return { success: false, error: "Praticien introuvable" };
    }

    const event = await prisma.events.findFirst({
      where: { id: eventId, practitioner_id: practitioner.id },
    });
    if (!event) {
      return { success: false, error: "Événement introuvable ou accès refusé" };
    }

    const reservedCount = await prisma.tickets.count({
      where: { event_id: eventId, status: "reserved_hold" },
    });
    const confirmedCount = await prisma.tickets.count({
      where: { event_id: eventId, status: "confirmed" },
    });

    if (confirmedCount > 0) {
      return {
        success: false,
        error: "Des paiements ont déjà été capturés. Utilisez « Annuler l'événement » pour rembourser.",
      };
    }

    if (reservedCount === 0) {
      await prisma.events.update({
        where: { id: eventId },
        data: { status: "canceled", confirmation_status: "CANCELED", updated_at: new Date() },
      });
      return { success: true, releasedCount: 0 };
    }

    return releaseEventPayments(eventId);
  } catch (err: unknown) {
    console.error("[cancelAndReleaseEvent] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de l'annulation",
    };
  }
}
