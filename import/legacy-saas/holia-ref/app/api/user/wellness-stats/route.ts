import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: Récupère les statistiques bien-être du patient en un seul appel optimisé :
 * - completedSessions: RDV marqués DONE ou dont la date de fin est passée ET payés (payment_status=PAID)
 * - totalWellnessMinutes: somme des durées pour ces séances
 * - favoritesCount: nombre d'entrées dans la table favorites pour cet userId
 *
 * Note: On compte les séances "effectivement réalisées" même si le cron n'a pas encore
 * marqué le statut DONE (évite d'afficher 0 quand le cron n'a pas tourné).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Séances réalisées = status DONE OU (date de fin passée ET payé)
    const result = await prisma.$queryRaw<
      Array<{
        completed_sessions: bigint;
        total_wellness_minutes: number;
        favorites_count: bigint;
      }>
    >`
      WITH completed_apts AS (
        SELECT a.id, s.duration_min
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.user_id = ${userId}
            AND (
              a.status = 'DONE'
              OR (
                a.payment_status = 'PAID'
                AND (a.starts_at + (COALESCE(s.duration_min, 60) * interval '1 minute')) < now()
              )
            )
      )
      SELECT
        (SELECT COUNT(*)::bigint FROM completed_apts) AS completed_sessions,
        (SELECT COALESCE(SUM(duration_min), 0)::int FROM completed_apts) AS total_wellness_minutes,
        (SELECT COUNT(*)::bigint FROM favorites WHERE user_id = ${userId}) AS favorites_count
    `;

    const row = result[0];
    if (!row) {
      return NextResponse.json({
        completedSessions: 0,
        totalWellnessMinutes: 0,
        favoritesCount: 0,
      });
    }

    return NextResponse.json({
      completedSessions: Number(row.completed_sessions),
      totalWellnessMinutes: Number(row.total_wellness_minutes),
      favoritesCount: Number(row.favorites_count),
    });
  } catch (error) {
    console.error("Error fetching wellness stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch wellness stats" },
      { status: 500 }
    );
  }
}
