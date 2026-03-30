import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



// GET: Récupérer un rendez-vous spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            duration_min: true,
            price_cents: true,
            location_type: true,
          },
        },
        practitioners: {
          select: {
            id: true,
            title: true,
            location_city: true,
            user_id: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            created_at: true,
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

    // Synchroniser le payment_status avec les factures Stripe si nécessaire
    if (appointment.status === "CONFIRMED" && appointment.payment_status !== "PAID") {
      const paidInvoice = await prisma.invoices.findFirst({
        where: {
          appointment_id: id,
          payment_method: "stripe",
          OR: [
            { status: "paid" },
            { status: "PAID" },
            { paid_at: { not: null } },
            { stripe_payment_intent_id: { not: null } }, // Si un payment_intent existe, c'est qu'un paiement a été traité
          ],
        },
      });

      if (paidInvoice) {
        // Mettre à jour le payment_status
        await prisma.appointments.update({
          where: { id },
          data: {
            payment_status: "PAID",
            updated_at: new Date(),
          },
        });
        
        // Recharger l'appointment avec le nouveau payment_status
        appointment = await prisma.appointments.findFirst({
          where: { id },
          include: {
            services: {
              select: {
                id: true,
                name: true,
                duration_min: true,
                price_cents: true,
                location_type: true,
              },
            },
            practitioners: {
              select: {
                id: true,
                title: true,
                location_city: true,
                user_id: true,
              },
            },
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            reviews: {
              select: {
                id: true,
                rating: true,
                comment: true,
                created_at: true,
              },
            },
          },
        });
      }
    }

    // Vérifier les permissions
    const isPractitioner =
      session.user.role === "PRACTITIONER" &&
      appointment.practitioners.user_id === session.user.id;
    const isClient = session.user.role === "CLIENT" && appointment.users.id === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isPractitioner && !isClient && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}
