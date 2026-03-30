import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 180;

/**
 * Supprime définitivement les messages liés à des rendez-vous DONE depuis plus de 180 jours.
 * À appeler via une tâche cron hebdomadaire.
 *
 * Configuration cron (exemple) :
 * 0 3 * * 0 curl -X GET "https://holia.me/api/cron/cleanup-old-messages" -H "Authorization: Bearer YOUR_CRON_SECRET"
 * (Chaque dimanche à 3h)
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

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // Récupérer les IDs des rendez-vous DONE dont la date est antérieure à la limite
    const oldAppointments = await prisma.appointments.findMany({
      where: {
        status: "DONE",
        starts_at: { lt: cutoffDate },
      },
      select: { id: true },
    });

    const appointmentIds = oldAppointments.map((a) => a.id);

    if (appointmentIds.length === 0) {
      return NextResponse.json({
        ok: true,
        deletedCount: 0,
        appointmentsChecked: 0,
        message: "Aucun message à supprimer",
      });
    }

    // Supprimer tous les messages de ces rendez-vous
    const result = await prisma.messages.deleteMany({
      where: {
        appointment_id: { in: appointmentIds },
      },
    });

    console.log(
      `[Cron] cleanup-old-messages: deleted ${result.count} messages from ${appointmentIds.length} appointments (older than ${RETENTION_DAYS} days)`
    );

    return NextResponse.json({
      ok: true,
      deletedCount: result.count,
      appointmentsProcessed: appointmentIds.length,
    });
  } catch (error) {
    console.error("[Cron] cleanup-old-messages error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup old messages" },
      { status: 500 }
    );
  }
}
