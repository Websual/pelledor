import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAppointmentReminderEmail } from "@/lib/emails";

// Route pour envoyer les emails de rappel (24h avant)
// Cette route peut être appelée par un cron job (ex: Vercel Cron, GitHub Actions, etc.)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production" && !cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Ne sélectionner QUE les rendez-vous :
    // - reminder_sent = false (pas encore de rappel envoyé)
    // - prévus dans les prochaines 24 heures
    // - Exclure les passés et annulés
    const appointments = await prisma.appointments.findMany({
      where: {
        status: "CONFIRMED",
        reminder_sent: false,
        starts_at: {
          gt: now,
          lte: in24h,
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practitioners: {
          include: {
            users: {
              select: {
                name: true,
              },
            },
          },
        },
        services: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Envoyer les emails de rappel
    const results = await Promise.allSettled(
      appointments.map(async (appointment) => {
        if (process.env.SMTP_HOST || (process.env.SMTP_USER && process.env.SMTP_PASS)) {
          try {
            await sendAppointmentReminderEmail({
              userName: appointment.users.name || appointment.users.email || "Client",
              practitionerName: appointment.practitioners.users?.name || appointment.practitioners.title,
              serviceName: appointment.services.name,
              startsAt: appointment.starts_at,
              userEmail: appointment.users.email,
              cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/account/appointments`,
            });
            // Verrouillage IMMÉDIAT après envoi pour éviter les doublons
            await prisma.appointments.update({
              where: { id: appointment.id },
              data: { reminder_sent: true },
            });
            console.log(`Rappel envoyé et verrouillé pour le RDV [${appointment.id}]`);
            return { appointmentId: appointment.id, status: "sent" };
          } catch (error) {
            console.error(`Error sending reminder for appointment ${appointment.id}:`, error);
            return { appointmentId: appointment.id, status: "error", error: String(error) };
          }
        } else {
          return { appointmentId: appointment.id, status: "skipped", reason: "SMTP not configured" };
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled" && r.value.status === "sent").length;
    const errors = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.status === "error")).length;
    const skipped = results.filter((r) => r.status === "fulfilled" && r.value.status === "skipped").length;

    return NextResponse.json({
      message: "Reminder emails processed",
      total: appointments.length,
      sent,
      errors,
      skipped,
      results: results.map((r) => (r.status === "fulfilled" ? r.value : { status: "error", error: String(r.reason) })),
    });
  } catch (error) {
    console.error("Error sending reminder emails:", error);
    return NextResponse.json(
      { error: "Failed to send reminder emails", details: String(error) },
      { status: 500 }
    );
  }
}

