import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import { decryptMessageContent } from "@/lib/crypto";

/**
 * POST: S'assurer qu'une conversation existe entre le patient connecté et le praticien (user_id).
 * Si aucune conversation (appointment) n'existe, en crée une "contact" (placeholder) pour permettre le premier message.
 * Body: { practitionerUserId: string, eventSlug?: string }
 * Returns: { conversation, eventTitle?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const practitionerUserId = typeof body.practitionerUserId === "string" ? body.practitionerUserId : null;
    const eventSlug = typeof body.eventSlug === "string" ? body.eventSlug : null;

    if (!practitionerUserId) {
      return NextResponse.json(
        { error: "practitionerUserId is required" },
        { status: 400 }
      );
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: practitionerUserId },
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
          take: 1,
          orderBy: { created_at: "asc" },
          select: { id: true, name: true },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    let apt = await prisma.appointments.findFirst({
      where: {
        user_id: session.user.id,
        practitioner_id: practitioner.id,
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
          select: { id: true, name: true },
        },
        messages: {
          orderBy: { created_at: "desc" },
          take: 1,
          include: { users: { select: { id: true } } },
        },
      },
      orderBy: { updated_at: "desc" },
    });

    if (!apt) {
      const firstService = practitioner.services[0];
      if (!firstService) {
        return NextResponse.json(
          { error: "Practitioner has no service" },
          { status: 400 }
        );
      }
      const now = new Date();
      const placeholderStartsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      apt = await prisma.appointments.create({
        data: {
          id: createId(),
          user_id: session.user.id,
          practitioner_id: practitioner.id,
          service_id: firstService.id,
          starts_at: placeholderStartsAt,
          updated_at: now,
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
            select: { id: true, name: true },
          },
          messages: {
            orderBy: { created_at: "desc" },
            take: 1,
            include: { users: { select: { id: true } } },
          },
        },
      });
    }

    let eventTitle: string | null = null;
    if (eventSlug) {
      const event = await prisma.events.findFirst({
        where: { slug: eventSlug },
        select: { title: true },
      });
      eventTitle = event?.title ?? null;
    }

    const lastMsg = apt.messages?.[0] ?? null;
    const conversation = {
      id: apt.id,
      appointmentId: apt.id,
      practitionerUserId: practitioner.users?.id ?? null,
      practitioner: apt.practitioners
        ? {
            id: apt.practitioners.id,
            userId: apt.practitioners.users?.id ?? null,
            slug: apt.practitioners.slug,
            title: apt.practitioners.title,
            photoUrl: apt.practitioners.photo_url,
            name: apt.practitioners.users?.name ?? null,
            email: apt.practitioners.users?.email ?? null,
          }
        : null,
      appointment: {
        id: apt.id,
        startsAt: apt.starts_at.toISOString(),
        service: apt.services
          ? { id: apt.services.id, name: apt.services.name }
          : null,
      },
      lastMessage: lastMsg
        ? {
            content: decryptMessageContent(lastMsg.content),
            createdAt: lastMsg.created_at.toISOString(),
            senderId: lastMsg.sender_id,
          }
        : null,
    };

    return NextResponse.json({
      conversation,
      eventTitle: eventTitle ?? undefined,
    });
  } catch (error) {
    console.error("Error ensuring conversation:", error);
    return NextResponse.json(
      { error: "Failed to ensure conversation" },
      { status: 500 }
    );
  }
}
