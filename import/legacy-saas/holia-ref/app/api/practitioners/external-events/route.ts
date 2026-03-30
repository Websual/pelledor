import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * API pour récupérer les événements externes (Google Calendar) du praticien
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le praticien de l'utilisateur connecté
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Récupérer la période demandée (par défaut mois en cours)
    const searchParams = req.nextUrl.searchParams;
    const monthParam = searchParams.get("month");
    const date = monthParam ? new Date(monthParam) : new Date();
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    // Récupérer les événements externes de cette période
    const externalEvents = await prisma.external_events.findMany({
      where: {
        practitioner_id: practitioner.id,
        starts_at: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      orderBy: {
        starts_at: "asc",
      },
    });

    return NextResponse.json(externalEvents);
  } catch (error: any) {
    console.error("[External Events] Erreur:", error);
    return NextResponse.json(
      { error: "Failed to fetch external events" },
      { status: 500 }
    );
  }
}
