import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un praticien
    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer le rendez-vous avec toutes les infos nécessaires
    const appointment = await prisma.appointments.findFirst({
      where: { id: appointmentId },
      include: {
        practitioners: {
          select: {
            id: true,
            user_id: true,
            stripe_account_id: true,
          },
        },
        services: {
          select: {
            price_cents: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Vérifier que le praticien est bien le propriétaire du rendez-vous
    if (appointment.practitioners.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier que le rendez-vous est payé
    if (appointment.payment_status !== "PAID") {
      return NextResponse.json(
        { error: "Appointment is not paid, no refund needed" },
        { status: 400 }
      );
    }

    // Vérifier que le rendez-vous n'est pas déjà annulé
    if (appointment.status === "CANCELED") {
      return NextResponse.json(
        { error: "Appointment is already canceled" },
        { status: 400 }
      );
    }

    // Récupérer la facture pour obtenir le payment_intent_id
    const invoice = await prisma.invoices.findFirst({
      where: {
        appointment_id: appointmentId,
        payment_method: "stripe",
        status: "paid",
      },
      select: {
        stripe_payment_intent_id: true,
        amount_cents: true,
      },
    });

    if (!invoice || !invoice.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "No Stripe payment found for this appointment" },
        { status: 400 }
      );
    }

    // Récupérer le PaymentIntent depuis le compte connecté
    const stripeAccountId = appointment.practitioners.stripe_account_id;
    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Practitioner Stripe account not found" },
        { status: 400 }
      );
    }

    try {
      // Récupérer le PaymentIntent pour obtenir le charge_id
      const paymentIntent = await stripe.paymentIntents.retrieve(
        invoice.stripe_payment_intent_id,
        {
          stripeAccount: stripeAccountId,
        }
      );

      if (!paymentIntent.latest_charge || typeof paymentIntent.latest_charge !== 'string') {
        return NextResponse.json(
          { error: "No charge found for this payment" },
          { status: 400 }
        );
      }

      // Créer le remboursement depuis le compte connecté
      const refund = await stripe.refunds.create(
        {
          charge: paymentIntent.latest_charge,
          amount: invoice.amount_cents, // Rembourser le montant total
          reason: 'requested_by_customer',
          metadata: {
            appointmentId: appointmentId,
            practitionerId: appointment.practitioners.id,
          },
        },
        {
          stripeAccount: stripeAccountId,
        }
      );

      console.log(`[Refund] Refund created for appointment ${appointmentId}: ${refund.id}`);

      // Enregistrer le remboursement dans la base de données
      await prisma.refunds.create({
        data: {
          id: refund.id,
          appointment_id: appointmentId,
          practitioner_id: appointment.practitioners.id,
          amount_cents: invoice.amount_cents,
          stripe_refund_id: refund.id,
          status: refund.status === 'succeeded' ? 'completed' : 'pending',
          reason: 'practitioner_cancellation',
          created_at: new Date(),
          updated_at: new Date(),
        } as any,
      });

      // Marquer le rendez-vous comme annulé
      await prisma.appointments.update({
        where: { id: appointmentId },
        data: {
          status: "CANCELED",
          updated_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount,
      });
    } catch (stripeError: any) {
      console.error("[Refund] Stripe refund error:", stripeError);
      
      // Enregistrer l'échec du remboursement pour l'admin
      await prisma.refunds.create({
        data: {
          id: `failed_${Date.now()}_${appointmentId}`,
          appointment_id: appointmentId,
          practitioner_id: appointment.practitioners.id,
          amount_cents: invoice.amount_cents,
          stripe_refund_id: null,
          status: 'failed',
          reason: 'practitioner_cancellation',
          error_message: stripeError.message || 'Unknown error',
          chargeback_dispute: false,
          created_at: new Date(),
          updated_at: new Date(),
        } as any,
      });

      return NextResponse.json(
        { 
          error: "Failed to create refund",
          details: stripeError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing refund:", error);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
