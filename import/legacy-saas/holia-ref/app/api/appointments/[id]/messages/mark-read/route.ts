import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST: Marque comme lues les notifications MESSAGE_RECEIVED pour ce RDV
 * Appelé quand le client ouvre le chat pour masquer la bulle de notification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier l'accès au RDV
    const appointment = await prisma.appointments.findFirst({
      where: { id: appointmentId },
      select: { user_id: true, practitioners: { select: { user_id: true } } },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const isClient = appointment.user_id === session.user.id;
    const isPractitioner = appointment.practitioners?.user_id === session.user.id;

    if (!isClient && !isPractitioner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Marquer les notifications MESSAGE_RECEIVED non lues pour ce RDV
    const result = await prisma.notifications.updateMany({
      where: {
        user_id: session.user.id,
        type: "MESSAGE_RECEIVED",
        read: false,
        metadata: {
          path: ["appointmentId"],
          equals: appointmentId,
        },
      },
      data: {
        read: true,
        read_at: new Date(),
      },
    });

    return NextResponse.json({ markedCount: result.count });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
