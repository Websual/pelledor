import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import { notifyMessageReceived } from "@/lib/notifications";
import { sendShadowPractitionerMessageEmail } from "@/lib/emails";
import { encryptMessageContent, decryptMessageContent } from "@/lib/crypto";



import { z } from "zod";


const messageSchema = z.object({
  content: z.string().min(1, "Le message ne peut pas être vide").max(5000, "Le message ne peut pas dépasser 5000 caractères"),
});

// GET: Récupérer les messages d'un rendez-vous
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur a accès à ce rendez-vous
    const appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        users: true,
        practitioners: {
          include: {
            users: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const isClient = session.user.role === "CLIENT" && appointment.user_id === session.user.id;
    const isPractitioner =
      session.user.role === "PRACTITIONER" && appointment.practitioners?.user_id === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isClient && !isPractitioner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer les messages
    const messages = await prisma.messages.findMany({
      where: { appointment_id: id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    // Déchiffrer le contenu avant envoi
    const decryptedMessages = messages.map((m) => ({
      ...m,
      content: decryptMessageContent(m.content),
    }));

    return NextResponse.json(decryptedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST: Créer un nouveau message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = messageSchema.parse(body);

    // Vérifier que l'utilisateur a accès à ce rendez-vous
    const appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        users: true,
        practitioners: {
          include: {
            users: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const isClient = session.user.role === "CLIENT" && appointment.user_id === session.user.id;
    const isPractitioner =
      session.user.role === "PRACTITIONER" && appointment.practitioners?.user_id === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isClient && !isPractitioner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Chiffrer le contenu avant stockage
    const encryptedContent = encryptMessageContent(validatedData.content);

    // Créer le message
    const message = await prisma.messages.create({
      data: {
        id: createId(),
        appointment_id: id,
        sender_id: session.user.id,
        content: encryptedContent,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Créer une notification pour le destinataire (ou email si praticien shadow)
    try {
      const recipientUserId =
        session.user.role === "PRACTITIONER"
          ? appointment.user_id || ""
          : appointment.practitioners?.user_id ?? "";
      const recipientRole = session.user.role === "PRACTITIONER" ? "CLIENT" : "PRACTITIONER";
      const senderId = session.user.id;
      const senderName = session.user.name || session.user.email || "Quelqu'un";

      // Praticien shadow (non réclamé) : pas de user_id, envoi email si contact_email
      const isShadowPractitioner =
        session.user.role === "CLIENT" &&
        (!recipientUserId || recipientUserId === "") &&
        appointment.practitioners;

      if (isShadowPractitioner) {
        const contactEmail = appointment.practitioners.contact_email?.trim();
        if (contactEmail) {
          try {
            await sendShadowPractitionerMessageEmail({
              practitionerEmail: contactEmail,
              patientName: senderName,
              practitionerId: appointment.practitioners.id,
            });
          } catch (emailError) {
            console.error("Error sending shadow practitioner message email:", emailError);
          }
        }
      } else if (recipientUserId) {
        const messagePreview = validatedData.content.length > 50
          ? validatedData.content.substring(0, 50) + "..."
          : validatedData.content;

        await notifyMessageReceived({
          recipientUserId,
          recipientRole,
          senderId,
          senderName,
          appointmentId: id,
          messagePreview,
        });
      }
    } catch (notifError) {
      console.error("Error creating message notification:", notifError);
      // Ne pas faire échouer la création du message si la notification échoue
    }

    // Retourner le message avec le contenu déchiffré (pour l'affichage immédiat)
    const responseMessage = {
      ...message,
      content: validatedData.content,
    };
    return NextResponse.json(responseMessage, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}


