import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import { sendFollowupReminderEmail } from "@/lib/emails";


// POST - Envoyer un rappel de suivi (appelé par un job/cron)
export async function POST(request: NextRequest) {
  try {
    // Vérifier que c'est un appel interne (avec secret) ou admin
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.REMINDER_JOB_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { practitionerId, userId, daysSinceLastAppointment } = body;

    if (!practitionerId || !userId) {
      return NextResponse.json(
        { error: "practitionerId and userId are required" },
        { status: 400 }
      );
    }

    // Récupérer le praticien
    const practitioner = await prisma.practitioners.findFirst({
      where: { id: practitionerId },
      include: {
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    // Vérifier si les rappels sont activés
    if (!practitioner.enable_followup_reminders) {
      return NextResponse.json({ message: "Reminders disabled for this practitioner" });
    }

    // Récupérer le client
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Récupérer le dernier RDV
    const lastAppointment = await prisma.appointments.findFirst({
      where: {
        practitioner_id: practitionerId,
        user_id: userId,
        status: "DONE",
      },
      orderBy: {
        starts_at: "desc",
      },
      include: {
        services: {
          select: {
            name: true,
          },
        },
      },
    });

    // Vérifier si un rappel a déjà été envoyé récemment (dans les 30 derniers jours)
    const recentReminder = await prisma.reminder_sent.findFirst({
      where: {
        practitioner_id: practitionerId,
        user_id: userId,
        reminder_type: "followup",
        sent_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
        },
      },
    });

    if (recentReminder) {
      return NextResponse.json({ message: "Reminder already sent recently" });
    }

    // Envoyer l'email de rappel
    try {
      await sendFollowupReminderEmail({
        userName: user.name || user.email || "Client",
        practitionerName: practitioner.users.name || practitioner.title,
        practitionerSlug: practitioner.slug,
        lastAppointmentDate: lastAppointment?.starts_at,
        lastServiceName: lastAppointment?.services.name,
        userEmail: user.email,
        daysSince: daysSinceLastAppointment || 90,
        bookingUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/praticien/${practitioner.slug}`,
      });

      // Enregistrer le rappel envoyé
      await prisma.reminder_sent.create({
        data: {
          id: createId(),
          practitioner_id: practitionerId,
          user_id: userId,
          appointment_id: lastAppointment?.id || null,
          reminder_type: "followup",
          last_appointment_date: lastAppointment?.starts_at || null,
        },
      });

      return NextResponse.json({ success: true, message: "Reminder sent" });
    } catch (emailError) {
      console.error("Error sending reminder email:", emailError);
      return NextResponse.json(
        { error: "Failed to send reminder email" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending reminder:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}

// GET - Détecter les clients inactifs et préparer les rappels
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.REMINDER_JOB_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const daysThreshold = parseInt(searchParams.get("days") || "90"); // 3 mois par défaut

    // Trouver tous les clients qui n'ont pas eu de RDV depuis X jours
    const inactiveClients = await prisma.appointments.findMany({
      where: {
        status: "DONE",
        starts_at: {
          lt: new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        practitioners: {
          select: {
            id: true,
            user_id: true,
            enable_followup_reminders: true,
            slug: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      distinct: ["practitioner_id", "user_id"],
    });

    // Grouper par praticien/client
    const remindersToSend: Array<{
      practitionerId: string;
      userId: string;
      daysSince: number;
      lastAppointmentId: string;
    }> = [];

    for (const appointment of inactiveClients) {
      // Vérifier si le praticien a activé les rappels
      if (!appointment.practitioners.enable_followup_reminders) {
        continue;
      }

      // Trouver le dernier RDV pour ce couple praticien/client
      const lastAppointment = await prisma.appointments.findFirst({
        where: {
          practitioner_id: appointment.practitioner_id,
          user_id: appointment.user_id,
          status: "DONE",
        },
        orderBy: {
          starts_at: "desc",
        },
      });

      if (!lastAppointment) continue;

      const daysSince = Math.floor(
        (Date.now() - lastAppointment.starts_at.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Vérifier si un rappel a déjà été envoyé récemment
      const recentReminder = await prisma.reminder_sent.findFirst({
        where: {
          practitioner_id: appointment.practitioner_id,
          user_id: appointment.user_id,
          reminder_type: "followup",
          sent_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!recentReminder && daysSince >= daysThreshold) {
        remindersToSend.push({
          practitionerId: appointment.practitioner_id,
          userId: appointment.user_id,
          daysSince,
          lastAppointmentId: lastAppointment.id,
        });
      }
    }

    return NextResponse.json({
      count: remindersToSend.length,
      reminders: remindersToSend,
    });
  } catch (error) {
    console.error("Error detecting inactive clients:", error);
    return NextResponse.json(
      { error: "Failed to detect inactive clients" },
      { status: 500 }
    );
  }
}

