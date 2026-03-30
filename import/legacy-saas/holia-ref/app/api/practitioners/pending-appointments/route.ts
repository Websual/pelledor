import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: {
        user_id: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!practitioner) {
      return NextResponse.json({ count: 0 });
    }

    // Compter les rendez-vous en attente
    const pendingCount = await prisma.appointments.count({
      where: {
        practitioner_id: practitioner.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({ count: pendingCount });
  } catch (error) {
    console.error("Error fetching pending appointments count:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending appointments count" },
      { status: 500 }
    );
  }
}
