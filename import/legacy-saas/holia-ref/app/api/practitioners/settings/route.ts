import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET - Récupérer les settings du praticien connecté
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: {
        id: true,
        video_link: true,
        enable_followup_reminders: true,
        auto_accept_appointments: true,
        allow_deferred_payment: true,
        google_calendar_block_slots: true,
        google_calendar_sync_out: true,
      },
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    return NextResponse.json(practitioner);
  } catch (error) {
    console.error("Error fetching practitioner settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour les settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      video_link,
      enable_followup_reminders,
      auto_accept_appointments,
      allow_deferred_payment,
      google_calendar_block_slots,
      google_calendar_sync_out,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (video_link !== undefined) updateData.video_link = video_link || null;
    if (enable_followup_reminders !== undefined) updateData.enable_followup_reminders = enable_followup_reminders;
    if (auto_accept_appointments !== undefined) updateData.auto_accept_appointments = auto_accept_appointments;
    if (allow_deferred_payment !== undefined) updateData.allow_deferred_payment = allow_deferred_payment;
    if (google_calendar_block_slots !== undefined) updateData.google_calendar_block_slots = google_calendar_block_slots;
    if (google_calendar_sync_out !== undefined) updateData.google_calendar_sync_out = google_calendar_sync_out;

    const practitioner = await prisma.practitioners.update({
      where: { user_id: session.user.id },
      data: updateData,
      select: {
        id: true,
        video_link: true,
        enable_followup_reminders: true,
        auto_accept_appointments: true,
        allow_deferred_payment: true,
        google_calendar_block_slots: true,
        google_calendar_sync_out: true,
      },
    });

    return NextResponse.json(practitioner);
  } catch (error) {
    console.error("Error updating practitioner settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

