/**
 * Logique partagée de capture / annulation des paiements événements (min_participants)
 * Utilisable par les Server Actions et le webhook Stripe
 */
import { prisma } from "./prisma";
import { stripe } from "./stripe";
import { sendEventConfirmedPaymentEmail } from "./emails";
import { createInvoice } from "./invoice-generator";
import { calculateHoliaCommission } from "./stripe-fees";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://holia.me";

export type CaptureResult =
  | { success: true; capturedCount: number }
  | { success: false; error: string };

/**
 * Capture les paiements des tickets reserved_hold et envoie les emails de confirmation.
 * À appeler quand min_participants est atteint.
 */
export async function captureEventPayments(eventId: string): Promise<CaptureResult> {
  const event = await prisma.events.findFirst({
    where: { id: eventId },
    include: {
      practitioners: {
        select: { id: true, stripe_account_id: true, subscription_status: true },
      },
    },
  });

  if (!event) {
    return { success: false, error: "Événement introuvable" };
  }

  const minParticipants = event.min_participants ?? 1;
  const reservedTickets = await prisma.tickets.findMany({
    where: {
      event_id: eventId,
      status: "reserved_hold",
      stripe_payment_intent_id: { not: null },
    },
    include: {
      users: { select: { id: true, name: true, email: true } },
    },
  });

  const totalQuantity = await prisma.tickets.aggregate({
    where: {
      event_id: eventId,
      status: { in: ["confirmed", "reserved_hold"] },
    },
    _sum: { quantity: true },
  });

  const totalParticipants = totalQuantity._sum.quantity ?? 0;
  if (totalParticipants < minParticipants) {
    return {
      success: false,
      error: `Minimum de ${minParticipants} participants non atteint (${totalParticipants} actuellement)`,
    };
  }

  const stripeAccountId = event.practitioners?.stripe_account_id;
  if (!stripeAccountId) {
    return { success: false, error: "Praticien sans compte Stripe" };
  }

  let capturedCount = 0;
  const eventAddress = event.address ?? null;

  for (const ticket of reservedTickets) {
    const piId = ticket.stripe_payment_intent_id;
    if (!piId) continue;

    try {
      await stripe.paymentIntents.capture(piId, {}, { stripeAccount: stripeAccountId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[captureEventPayments] Capture failed for ticket ${ticket.id}:`, msg);
      return { success: false, error: `Erreur Stripe : ${msg}` };
    }

    const amountCents = event.price_cents * ticket.quantity;
    await prisma.tickets.update({
      where: { id: ticket.id },
      data: { status: "confirmed", amount_cents: amountCents },
    });
    capturedCount++;

    // Facture : même décomposition que RDV (Net Pro / Commission Holia 8% / Frais Stripe)
    const practitionerId = event.practitioners?.id;
    const subscriptionStatus = event.practitioners?.subscription_status || "free";
    const theoreticalPlatformFeeCents = calculateHoliaCommission(amountCents, subscriptionStatus);
    let stripeFeeCents = 0;
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const pi = await stripe.paymentIntents.retrieve(
        piId,
        { expand: ["latest_charge.balance_transaction"] },
        { stripeAccount: stripeAccountId }
      );
      const applicationFeeAmount = (pi as any).application_fee_amount ?? null;
      const charge = pi.latest_charge;
      if (charge) {
        const chargeId = typeof charge === "string" ? charge : (charge as any).id;
        const chargeObj = typeof charge === "object" ? charge : await stripe.charges.retrieve(
          chargeId,
          { expand: ["balance_transaction"] },
          { stripeAccount: stripeAccountId }
        );
        let btId: string | null = typeof (chargeObj as any).balance_transaction === "string"
          ? (chargeObj as any).balance_transaction
          : (chargeObj as any).balance_transaction?.id;
        if (!btId) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            const ref = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] }, { stripeAccount: stripeAccountId });
            btId = typeof ref.balance_transaction === "string" ? ref.balance_transaction : (ref.balance_transaction as any)?.id;
            if (btId) break;
          }
        }
        if (btId) {
          const bt = await stripe.balanceTransactions.retrieve(btId, {}, { stripeAccount: stripeAccountId });
          const feeDetails = (bt as any).fee_details || [];
          const stripeFeeDetail = feeDetails.find((fd: any) => fd.type === "stripe_fee");
          stripeFeeCents = stripeFeeDetail?.amount ?? Math.max(0, (bt.fee || 0) - (applicationFeeAmount || 0));
        }
      }
      const platformFeeCents = applicationFeeAmount ?? theoreticalPlatformFeeCents;
      const practitionerAmountCents = amountCents - platformFeeCents - stripeFeeCents;
      if (practitionerId) {
        const existing = await prisma.invoices.findFirst({ where: { ticket_id: ticket.id } });
        if (!existing) {
          const invoiceId = await createInvoice({
            practitionerId,
            ticketId: ticket.id,
            userId: ticket.user_id,
            amountCents,
            paymentMethod: "stripe",
            status: "paid",
            platformFeeCents,
            practitionerAmountCents,
            stripeFeeCents,
            description: `Participation à ${event.title}`,
          });
          await prisma.invoices.update({
            where: { id: invoiceId },
            data: {
              paid_at: new Date(),
              stripe_processing_fee_cents: stripeFeeCents,
              platform_fee_cents: platformFeeCents,
              stripe_payment_intent_id: piId,
              practitioner_amount_cents: practitionerAmountCents,
            },
          });
        }
      }
    } catch (invErr) {
      console.error(`[captureEventPayments] Invoice creation for ticket ${ticket.id}:`, invErr);
    }

    const receiptUrl = `${baseUrl}/api/tickets/${ticket.id}/receipt`;
    if (ticket.users?.email) {
      try {
        await sendEventConfirmedPaymentEmail({
          userName: ticket.users.name || "Client",
          userEmail: ticket.users.email,
          eventTitle: event.title,
          eventDate: event.date,
          eventAddress,
          receiptUrl,
        });
      } catch (emailErr) {
        console.error(`[captureEventPayments] Email failed for ticket ${ticket.id}:`, emailErr);
      }
    }
  }

  await prisma.events.update({
    where: { id: eventId },
    data: {
      confirmation_status: "CONFIRMED",
      updated_at: new Date(),
    },
  });

  return { success: true, capturedCount };
}

export type ReleaseResult =
  | { success: true; releasedCount: number }
  | { success: false; error: string };

/**
 * Annule les PaymentIntents (libère les fonds sans capture) pour les tickets reserved_hold.
 * À appeler quand le praticien annule l'événement avant confirmation.
 */
export async function releaseEventPayments(eventId: string): Promise<ReleaseResult> {
  const event = await prisma.events.findFirst({
    where: { id: eventId },
    include: {
      practitioners: {
        select: { stripe_account_id: true },
      },
    },
  });

  if (!event) {
    return { success: false, error: "Événement introuvable" };
  }

  const reservedTickets = await prisma.tickets.findMany({
    where: {
      event_id: eventId,
      status: "reserved_hold",
      stripe_payment_intent_id: { not: null },
    },
  });

  const stripeAccountId = event.practitioners?.stripe_account_id;
  if (!stripeAccountId && reservedTickets.length > 0) {
    return { success: false, error: "Praticien sans compte Stripe" };
  }

  let releasedCount = 0;
  for (const ticket of reservedTickets) {
    const piId = ticket.stripe_payment_intent_id;
    if (!piId || !stripeAccountId) continue;

    try {
      await stripe.paymentIntents.cancel(piId, { stripeAccount: stripeAccountId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[releaseEventPayments] Cancel failed for ticket ${ticket.id}:`, msg);
      return { success: false, error: `Erreur Stripe : ${msg}` };
    }

    await prisma.tickets.update({
      where: { id: ticket.id },
      data: { status: "canceled" },
    });
    releasedCount++;
  }

  const offlineTickets = await prisma.tickets.findMany({
    where: { event_id: eventId, status: "payment_pending_offline" },
  });
  for (const t of offlineTickets) {
    await prisma.tickets.update({
      where: { id: t.id },
      data: { status: "canceled" },
    });
  }

  const totalQuantity =
    reservedTickets.reduce((sum, t) => sum + t.quantity, 0) +
    offlineTickets.reduce((sum, t) => sum + t.quantity, 0);
  await prisma.events.update({
    where: { id: eventId },
    data: {
      remaining_places: { increment: totalQuantity },
      confirmation_status: "CANCELED",
      status: "canceled",
      updated_at: new Date(),
    },
  });

  return { success: true, releasedCount };
}
