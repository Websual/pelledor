import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/invoice-generator";
import { sendInvoiceEmail } from "@/lib/emails";

/**
 * POST: Encaisser un ticket en paiement sur place -> status confirmed, facture générée
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: ticketId } = await params;

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true, title: true },
    });
    if (!practitioner) {
      return NextResponse.json({ error: "Praticien introuvable" }, { status: 404 });
    }

    const ticket = await prisma.tickets.findFirst({
      where: {
        id: ticketId,
        status: "payment_pending_offline",
      },
      include: {
        events: true,
        users: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket || ticket.events.practitioner_id !== practitioner.id) {
      return NextResponse.json(
        { error: "Ticket introuvable ou accès refusé" },
        { status: 404 }
      );
    }

    const amountCents = ticket.events.price_cents * ticket.quantity;

    const invoiceId = await createInvoice({
      practitionerId: practitioner.id,
      ticketId: ticket.id,
      userId: ticket.user_id,
      amountCents,
      paymentMethod: "cash",
      status: "paid",
      description: `Participation à ${ticket.events.title}`,
    });

    await prisma.tickets.update({
      where: { id: ticketId },
      data: {
        status: "confirmed",
        amount_cents: amountCents,
      },
    });

    if (ticket.users?.email) {
      await sendInvoiceEmail({
        invoiceId,
        clientEmail: ticket.users.email,
        clientName: ticket.users.name,
        practitionerName: practitioner.title,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Paiement enregistré et facture générée",
      invoiceId,
    });
  } catch (error) {
    console.error("[tickets/collect] Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
