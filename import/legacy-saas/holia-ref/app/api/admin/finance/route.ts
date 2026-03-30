import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculer MRR (abonnements Premium)
    const premiumPractitioners = await prisma.practitioners.count({
      where: {
        subscription_status: "active",
      },
    });
    const mrr = premiumPractitioners * 29; // 29€/mois par praticien Premium

    // Calculer GMV et commissions
    const appointments = await prisma.appointments.findMany({
      where: {
        status: "DONE",
      },
      include: {
        services: {
          select: {
            price_cents: true,
          },
        },
      },
    });

    const gmv = appointments.reduce(
      (sum, apt) => sum + (apt.services?.price_cents || 0),
      0
    ) / 100;

    // Commissions: 8% du GMV pour les praticiens Freemium
    const freemiumAppointments = appointments.filter((apt) => {
      // Simplification: on considère que tous les RDV sont Freemium pour l'instant
      return true;
    });
    const commissions = freemiumAppointments.reduce(
      (sum, apt) => sum + (apt.services?.price_cents || 0) * 0.08,
      0
    ) / 100;

    return NextResponse.json({
      mrr,
      gmv,
      commissions,
    });
  } catch (error) {
    console.error("Error fetching finance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance data" },
      { status: 500 }
    );
  }
}

