import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



// GET - Récupérer les notes d'un RDV (praticien uniquement)
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

    // Vérifier que c'est le praticien du RDV
    const appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        practitioners: {
          select: {
            user_id: true,
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

    // Récupérer les notes
    const notes = await prisma.appointment_notes.findUnique({
      where: { appointment_id: id },
    });

    return NextResponse.json(notes || { notes: "" });
  } catch (error) {
    console.error("Error fetching appointment notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// PUT - Créer ou mettre à jour les notes (praticien uniquement)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notes } = body;

    if (typeof notes !== "string") {
      return NextResponse.json(
        { error: "Notes must be a string" },
        { status: 400 }
      );
    }

    // Vérifier que c'est le praticien du RDV
    const appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        practitioners: {
          select: {
            user_id: true,
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

    // Créer ou mettre à jour les notes
    const appointmentNotes = await prisma.appointment_notes.upsert({
      where: { appointment_id: id },
      update: { notes },
      create: {
        appointment_id: id,
        notes,
      },
    });

    return NextResponse.json(appointmentNotes);
  } catch (error) {
    console.error("Error saving appointment notes:", error);
    return NextResponse.json(
      { error: "Failed to save notes" },
      { status: 500 }
    );
  }
}

