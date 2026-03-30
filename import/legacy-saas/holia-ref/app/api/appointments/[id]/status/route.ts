import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyBookingCanceled, notifyBookingConfirmed } from "@/lib/notifications";
import { sendAppointmentCancellationEmail, sendReviewInvitationEmail } from "@/lib/emails";
import { createGoogleEvent, deleteGoogleEvent } from "@/lib/google-calendar";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELED" | "DONE";

export async function PATCH(
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
    const { status } = body;

    if (!["PENDING", "CONFIRMED", "CANCELED", "DONE"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        practitioners: {
          select: {
            id: true,
            title: true,
            user_id: true,
            google_calendar_sync_out: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isPractitioner =
      session.user.role === "PRACTITIONER" &&
      appointment.practitioners.user_id === session.user.id;
    const isClient = session.user.role === "CLIENT" && appointment.user_id === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isPractitioner && !isClient && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier si le statut change
    const isStatusChanging = appointment.status !== status;
    const isCanceling = status === "CANCELED" && appointment.status !== "CANCELED";
    const isMarkingDone = status === "DONE" && appointment.status !== "DONE";
    
    // Déterminer qui annule
    const canceledBy = isCanceling
      ? (session.user.role === "PRACTITIONER" ? "practitioner" : "client")
      : undefined;

    const updatedAppointment = await prisma.appointments.update({
      where: { id },
      data: {
        status: status as AppointmentStatus,
        updated_at: new Date(),
      },
      include: {
        services: true,
        practitioners: {
          include: {
            users: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        users: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        reviews: true,
      },
    });

    // Sync Google Calendar : annulation -> supprimer l'événement
    if (isCanceling && appointment.google_event_id && appointment.practitioners?.user_id) {
      try {
        await deleteGoogleEvent(appointment.google_event_id, appointment.practitioners.user_id);
        await prisma.appointments.update({
          where: { id },
          data: { google_event_id: null, updated_at: new Date() },
        });
      } catch (gcErr) {
        console.error(`[Status] Google Calendar delete failed for appointment ${id}:`, gcErr);
      }
    }

    // Sync Google Calendar : confirmation (PENDING -> CONFIRMED) -> créer l'événement
    const syncOut = appointment.practitioners?.google_calendar_sync_out !== false;
    if (
      isStatusChanging &&
      status === "CONFIRMED" &&
      appointment.status === "PENDING" &&
      !appointment.google_event_id &&
      appointment.practitioners?.user_id &&
      syncOut
    ) {
      try {
        const event = await createGoogleEvent(id);
        if (event?.id) {
          // google_event_id est déjà enregistré dans createGoogleEvent
          console.log(`[Status] Google Calendar - Événement créé: ${event.id} pour appointment ${id}`);
        } else if (event === null) {
          console.log(`[Status] Google Calendar - Événement déjà existant pour appointment ${id}, création ignorée`);
        }
      } catch (gcErr) {
        console.error(`[Status] Google Calendar create failed for appointment ${id}:`, gcErr);
      }
    }

    // Créer les notifications pour les changements de statut
    if (isStatusChanging) {
      try {
        // Notification d'annulation
        if (isCanceling) {
          const isPractitioner = session.user.role === "PRACTITIONER";
          await notifyBookingCanceled({
            userId: isPractitioner ? appointment.user_id || "" : appointment.practitioners?.user_id || "",
            isPractitioner: !isPractitioner, // L'autre partie reçoit la notification
            otherPartyName: isPractitioner
              ? appointment.practitioners?.users?.name || appointment.practitioners?.title || "Le praticien"
              : appointment.users?.name || appointment.users?.email || "Le patient",
            appointmentId: id,
            serviceName: appointment.services?.name || "Service",
            startsAt: appointment.starts_at,
            clientName: appointment.users?.name || appointment.users?.email || undefined,
          });
        }

        // Notification de confirmation (si le praticien accepte un RDV en attente)
        if (status === "CONFIRMED" && appointment.status === "PENDING") {
          await notifyBookingConfirmed({
            clientUserId: appointment.user_id || "",
            practitionerName: appointment.practitioners?.users?.name || appointment.practitioners?.title || "Le praticien",
            appointmentId: id,
            serviceName: appointment.services.name,
            startsAt: appointment.starts_at,
          });
        }
      } catch (notifError) {
        console.error("Error creating notifications:", notifError);
        // Ne pas faire échouer la mise à jour si les notifications échouent
      }
    }

    // Envoyer les emails si SMTP est configuré
    if (isStatusChanging && (process.env.SMTP_HOST || (process.env.SMTP_USER && process.env.SMTP_PASS))) {
      // Email d'annulation
      if (isCanceling && canceledBy) {
        try {
          // Email au client
          await sendAppointmentCancellationEmail({
            userName: appointment.users?.name || appointment.users?.email || "Client",
            practitionerName: appointment.practitioners?.users?.name || appointment.practitioners?.title || "Praticien",
            serviceName: appointment.services?.name || "Service",
            startsAt: appointment.starts_at,
            userEmail: appointment.users?.email || "",
            canceledBy: canceledBy,
            appointmentsUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/account/appointments`,
          });

          // Email au praticien
          if (canceledBy === "client") {
            // Si c'est le client qui annule, informer le praticien
            await sendAppointmentCancellationEmail({
              userName: appointment.practitioners?.users?.name || appointment.practitioners?.title || "Praticien",
              practitionerName: appointment.practitioners?.users?.name || appointment.practitioners?.title || "Praticien",
              serviceName: appointment.services?.name || "Service",
              startsAt: appointment.starts_at,
              userEmail: appointment.practitioners?.users?.email || "",
              canceledBy: "client",
              appointmentsUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/pro/appointments`,
            });
          } else if (canceledBy === "practitioner") {
            // Si c'est le praticien qui annule, lui envoyer une confirmation
            await sendAppointmentCancellationEmail({
              userName: appointment.practitioners?.users?.name || appointment.practitioners?.title || "Praticien",
              practitionerName: appointment.practitioners?.users?.name || appointment.practitioners?.title || "Praticien",
              serviceName: appointment.services?.name || "Service",
              startsAt: appointment.starts_at,
              userEmail: appointment.practitioners?.users?.email || "",
              canceledBy: "practitioner",
              appointmentsUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/pro/appointments`,
            });
          }
        } catch (emailError) {
          console.error("Error sending cancellation emails:", emailError);
          // Ne pas faire échouer la mise à jour si l'email échoue
        }
      }

      // Email d'invitation à laisser un avis
      if (isMarkingDone) {
        try {
          // Vérifier qu'il n'y a pas déjà un avis pour ce rendez-vous
          const existingReview = await prisma.reviews.findFirst({
            where: { appointment_id: id },
          });

          if (!existingReview && appointment.users && appointment.services && appointment.practitioners) {
            await sendReviewInvitationEmail({
              userName: appointment.users.name || appointment.users.email || "Client",
              practitionerName: appointment.practitioners.users?.name || appointment.practitioners.title,
              serviceName: appointment.services.name,
              appointmentId: id,
              userEmail: appointment.users.email,
              reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/account/reviews/${id}`,
            });
          }
        } catch (emailError) {
          console.error("Error sending review invitation email:", emailError);
          // Ne pas faire échouer la mise à jour si l'email échoue
        }
      }
    }

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return NextResponse.json(
      { error: "Failed to update appointment status" },
      { status: 500 }
    );
  }
}

