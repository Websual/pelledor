import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



// GET - Récupérer l'historique des RDV avec un client (praticien uniquement)
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

    // Récupérer le RDV pour obtenir le client et le praticien
    const appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        practitioners: {
          select: {
            id: true,
            user_id: true,
          },
        },
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (session.user.role !== "PRACTITIONER" || appointment.practitioners.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer tous les RDV passés avec ce client
    const history = await prisma.appointments.findMany({
      where: {
        practitioner_id: appointment.practitioners.id,
        user_id: appointment.users.id,
        starts_at: {
          lt: new Date(), // Seulement les RDV passés
        },
      },
      include: {
        services: {
          select: {
            name: true,
            duration_min: true,
            price_cents: true,
          },
        },
        appointment_notes: {
          select: {
            notes: true,
            updated_at: true,
          },
        },
      },
      orderBy: {
        starts_at: "desc",
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching appointment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

