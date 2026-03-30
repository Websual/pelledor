import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";

/**
 * POST: Réserver une place en paiement sur place (pour événements avec allow_on_site_payment)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    const { eventId } = await params;

    const event = await prisma.events.findFirst({
      where: {
        id: eventId,
        status: "active",
        allow_on_site_payment: true,
        remaining_places: { gt: 0 },
        date: { gte: new Date() },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Événement introuvable ou paiement sur place non autorisé" },
        { status: 404 }
      );
    }

    const quantity = 1;
    const amountCents = event.price_cents * quantity;

    const ticket = await prisma.tickets.create({
      data: {
        id: createId(),
        event_id: event.id,
        user_id: session.user.id,
        quantity,
        amount_cents: amountCents,
        status: "payment_pending_offline",
      },
    });

    await prisma.events.update({
      where: { id: event.id },
      data: { remaining_places: { decrement: quantity } },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://holia.me";
    const successUrl = `${baseUrl}/evenements/${event.slug}?reserved=offline&amount=${amountCents}`;

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      redirectUrl: successUrl,
      amountCents,
    });
  } catch (error) {
    console.error("[reserve-offline] Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
