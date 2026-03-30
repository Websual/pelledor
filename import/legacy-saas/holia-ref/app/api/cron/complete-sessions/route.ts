import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSessionCompletedEmail } from "@/lib/emails";

/**
 * Route API pour automatiser la clôture des séances
 * À appeler via une tâche cron toutes les heures (ou plus souvent)
 *
 * Cherche les rendez-vous dont :
 * - La date de fin (starts_at + duration_min) est passée
 * - Le statut est CONFIRMED ou PENDING
 * - Le payment_status est PAID
 *
 * Les marque comme DONE et envoie l'email de fin de séance
 *
 * Configuration cron (exemple avec crontab) :
 * 0 * * * * curl -X GET "https://holia.me/api/cron/complete-sessions" -H "Authorization: Bearer YOUR_CRON_SECRET"
 *
 * Ou avec un service de cron externe (ex: cron-job.org) :
 * - URL: https://holia.me/api/cron/complete-sessions
 * - Méthode: GET
 * - Headers: Authorization: Bearer YOUR_CRON_SECRET
 * - Fréquence: Toutes les heures (ou toutes les 15 min pour plus de réactivité)
 */
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

    console.log(`[Cron] Starting session completion check at ${now.toISOString()}`);

    // Récupérer tous les rendez-vous qui doivent être complétés
    const appointmentsToComplete = await prisma.appointments.findMany({
      where: {
        status: {
          in: ["CONFIRMED", "PENDING"],
        },
        payment_status: "PAID",
      },
      include: {
        practitioners: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            duration_min: true,
            price_cents: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`[Cron] Found ${appointmentsToComplete.length} paid appointments to check`);

    // Filtrer ceux dont la date de fin est passée (séance terminée)
    const appointmentsToMarkAsDone = appointmentsToComplete.filter((apt) => {
      const durationMinutes = apt.services?.duration_min || 60;
      const endTime = new Date(apt.starts_at.getTime() + durationMinutes * 60 * 1000);
      return endTime < now;
    });

    console.log(`[Cron] ${appointmentsToMarkAsDone.length} appointments need to be marked as DONE`);

    const results = {
      checked: appointmentsToComplete.length,
      completed: 0,
      errors: [] as string[],
    };

    // Traiter chaque rendez-vous
    for (const appointment of appointmentsToMarkAsDone) {
      try {
        // Marquer comme terminé
        await prisma.appointments.update({
          where: { id: appointment.id },
          data: {
            status: "DONE",
            updated_at: new Date(),
          },
        });

        // Récupérer la facture associée si elle existe
        const invoice = await prisma.invoices.findFirst({
          where: {
            appointment_id: appointment.id,
            status: "PAID",
          },
          select: {
            id: true,
          },
        });

        // Envoyer l'email de fin de séance
        try {
          await sendSessionCompletedEmail({
            userName: appointment.users.name || "Client",
            practitionerName: appointment.practitioners.title || "Praticien",
            serviceName: appointment.services?.name || "Service",
            startsAt: appointment.starts_at,
            userEmail: appointment.users.email,
            appointmentId: appointment.id,
            invoiceId: invoice?.id || null,
            practitionerSlug: appointment.practitioners.slug,
          });
          console.log(`[Cron] Session completed email sent for appointment ${appointment.id}`);
        } catch (emailError) {
          console.error(`[Cron] Error sending email for appointment ${appointment.id}:`, emailError);
          results.errors.push(`Email error for ${appointment.id}: ${emailError instanceof Error ? emailError.message : "Unknown error"}`);
        }

        results.completed++;
      } catch (error) {
        console.error(`[Cron] Error processing appointment ${appointment.id}:`, error);
        results.errors.push(`Processing error for ${appointment.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    console.log(`[Cron] Completed: ${results.completed} appointments marked as DONE`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("[Cron] Error in complete-sessions:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
