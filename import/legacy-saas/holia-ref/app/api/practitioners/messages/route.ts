import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptMessageContent } from "@/lib/crypto";


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const archived = searchParams.get("archived") === "true";

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Get appointments with messages for this practitioner
    const appointments = await prisma.appointments.findMany({
      where: {
        practitioner_id: practitioner.id,
        messages: {
          some: {}, // Au moins un message
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          orderBy: {
            created_at: "desc",
          },
          take: 1, // Dernier message seulement
          include: {
            users: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        starts_at: "desc",
      },
    });

    // Formater les conversations
    const conversations = appointments.map((apt) => {
      const lastMessage = apt.messages[0];
      return {
        id: apt.id,
        appointmentId: apt.id,
        patient: {
          id: apt.users.id,
          name: apt.users.name,
          email: apt.users.email,
        },
        appointment: {
          id: apt.id,
          startsAt: apt.starts_at.toISOString(),
          service: {
            name: apt.services.name,
          },
        },
            lastMessage: lastMessage
              ? {
                  content: decryptMessageContent(lastMessage.content),
                  createdAt: lastMessage.created_at.toISOString(),
                  senderId: lastMessage.users?.id || lastMessage.sender_id,
                }
              : null,
        unreadCount: 0, // TODO: Implémenter le système de lecture
        isArchived: false, // TODO: Implémenter l'archivage
      };
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}


