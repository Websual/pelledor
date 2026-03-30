import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/invoice-generator";
import { sendInvoiceEmail } from "@/lib/emails";




import { z } from "zod";

const collectPaymentSchema = z.object({
  paymentMethod: z.enum(["cash", "check", "bank_transfer", "other"]),
  amountCents: z.number().optional(), // Si non fourni, utilise le prix du service
  sendEmail: z.boolean().optional().default(true),
});

/**
 * POST: Marquer un rendez-vous comme payé et générer une facture
 * C'est le bouton "Encaisser" dans l'agenda
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = collectPaymentSchema.parse(body);

    // Récupérer le rendez-vous
    const appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        practitioners: true,
        services: true,
        users: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est bien le praticien de ce rendez-vous
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true },
    });
    if (!practitioner || appointment.practitioner_id !== practitioner.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const amountCents = validatedData.amountCents || appointment.services?.price_cents || 0;

    // Créer la facture
    const invoiceId = await createInvoice({
      practitionerId: appointment.practitioner_id,
      appointmentId: id,
      userId: appointment.users?.id || appointment.user_id,
      amountCents,
      paymentMethod: validatedData.paymentMethod,
      status: "paid",
    });

    // Marquer le rendez-vous comme payé et terminé (facture finale)
    await prisma.appointments.update({
      where: { id },
      data: {
        status: "DONE",
        payment_status: "PAID",
        updated_at: new Date(),
      },
    });

    // Envoyer la facture par email si demandé
    if (validatedData.sendEmail) {
      await sendInvoiceEmail({
        invoiceId,
        clientEmail: appointment.users.email,
        clientName: appointment.users.name,
        practitionerName: appointment.practitioners?.title || "Praticien"
      });
    }

    // Récupérer la facture créée
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        appointments: {
          include: {
            services: true,
            users: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Paiement enregistré et facture générée",
      invoice,
    });
  } catch (error) {
    console.error("Error collecting payment:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to collect payment" },
      { status: 500 }
    );
  }
}

