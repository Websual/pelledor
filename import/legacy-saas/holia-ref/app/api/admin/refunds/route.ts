import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer tous les remboursements avec les informations du rendez-vous et du praticien
    const refunds = await prisma.refunds.findMany({
      include: {
        appointments: {
          include: {
            users: {
              select: {
                name: true,
                email: true,
              },
            },
            services: {
              select: {
                name: true,
              },
            },
          },
        },
        practitioners: {
          include: {
            users: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Transformer les données pour le frontend
    const formattedRefunds = refunds.map((refund) => ({
      id: refund.id,
      appointment_id: refund.appointment_id,
      practitioner_id: refund.practitioner_id,
      amount_cents: refund.amount_cents,
      stripe_refund_id: refund.stripe_refund_id,
      status: refund.status,
      reason: refund.reason,
      error_message: refund.error_message,
      chargeback_dispute: refund.chargeback_dispute,
      created_at: refund.created_at.toISOString(),
      updated_at: refund.updated_at.toISOString(),
      appointment: refund.appointments ? {
        id: refund.appointments.id,
        starts_at: refund.appointments.starts_at.toISOString(),
        users: refund.appointments.users,
        services: refund.appointments.services,
      } : null,
      practitioner: refund.practitioners ? {
        id: refund.practitioners.id,
        title: refund.practitioners.title,
        users: refund.practitioners.users,
      } : null,
    }));

    return NextResponse.json(formattedRefunds);
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}
