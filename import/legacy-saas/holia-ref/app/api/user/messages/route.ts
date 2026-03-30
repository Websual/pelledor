import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptMessageContent } from "@/lib/crypto";

// GET: Récupérer les conversations (tous les appointments du patient, avec ou sans message) pour permettre le premier message depuis un événement
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tous les appointments où l'utilisateur est le patient (y compris sans message, pour conversations "contact événement")
    const appointments = await prisma.appointments.findMany({
      where: {
        user_id: session.user.id,
      },
      include: {
        practitioners: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
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
        messages: {
          orderBy: { created_at: "desc" },
          take: 1,
          include: {
            users: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { starts_at: "desc" },
    });

    // Trier par date du dernier message (plus récent en premier)
    appointments.sort((a, b) => {
      const aLast = a.messages[0]?.created_at;
      const bLast = b.messages[0]?.created_at;
      if (!aLast) return 1;
      if (!bLast) return -1;
      return bLast.getTime() - aLast.getTime();
    });

    const conversations = appointments.map((apt) => {
      const lastMessage = apt.messages[0];
      const practitionerUserId = apt.practitioners?.users?.id;
      return {
        id: apt.id,
        appointmentId: apt.id,
        practitionerUserId,
        practitioner: apt.practitioners
          ? {
              id: apt.practitioners.id,
              userId: practitionerUserId,
              slug: apt.practitioners.slug,
              title: apt.practitioners.title,
              photoUrl: apt.practitioners.photo_url,
              name: apt.practitioners.users?.name,
              email: apt.practitioners.users?.email,
            }
          : null,
        appointment: {
          id: apt.id,
          startsAt: apt.starts_at.toISOString(),
          service: apt.services
            ? { id: apt.services.id, name: apt.services.name }
            : null,
        },
        lastMessage: lastMessage
          ? {
              content: decryptMessageContent(lastMessage.content),
              createdAt: lastMessage.created_at.toISOString(),
              senderId: lastMessage.sender_id,
            }
          : null,
      };
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching user messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
