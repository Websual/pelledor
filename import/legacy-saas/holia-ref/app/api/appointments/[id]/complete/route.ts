import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSessionCompletedEmail, sendInvoiceEmail } from "@/lib/emails";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: appointmentId } = await params;

    // Récupérer le rendez-vous avec toutes les informations nécessaires
    const appointment = await prisma.appointments.findFirst({
      where: { id: appointmentId },
      include: {
        practitioners: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            duration_min: true,
            price_cents: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Vérifier que le praticien est bien le propriétaire du rendez-vous
    const practitioner = await prisma.practitioners.findFirst({
      where: {
        id: appointment.practitioner_id,
        user_id: session.user.id,
      },
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier que le rendez-vous n'est pas déjà terminé
    if (appointment.status === "DONE") {
      return NextResponse.json({ error: "Appointment already completed" }, { status: 400 });
    }

    // Marquer le rendez-vous comme terminé
    await prisma.appointments.update({
      where: { id: appointmentId },
      data: {
        status: "DONE",
        updated_at: new Date(),
      },
    });

    // Récupérer la facture associée si elle existe
    const invoice = await prisma.invoices.findFirst({
      where: {
        appointment_id: appointmentId,
        status: "PAID",
      },
      select: {
        id: true,
      },
    });

    // Envoyer l'email de fin de séance
    try {
      await sendSessionCompletedEmail({
        userName: appointment.users.name || "Client",
        practitionerName: appointment.practitioners.title || "Praticien",
        serviceName: appointment.services.name,
        startsAt: appointment.starts_at,
        userEmail: appointment.users.email,
        appointmentId: appointmentId,
        invoiceId: invoice?.id || null,
        practitionerSlug: appointment.practitioners.slug,
      });
      console.log(`[API] Session completed email sent to ${appointment.users.email} for appointment ${appointmentId}`);
    } catch (emailError) {
      console.error(`[API] Error sending session completed email:`, emailError);
      // Ne pas faire échouer la requête si l'email échoue
    }

    // Envoyer la facture par email (uniquement lors de "Marquer comme terminé")
    if (invoice?.id && appointment.payment_status === "PAID") {
      try {
        await sendInvoiceEmail({
          invoiceId: invoice.id,
          clientEmail: appointment.users.email,
          clientName: appointment.users.name,
          practitionerName: appointment.practitioners.title || "Praticien",
        });
        console.log(`[API] Invoice email sent to ${appointment.users.email} for invoice ${invoice.id}`);
      } catch (emailError) {
        console.error(`[API] Error sending invoice email:`, emailError);
        // Ne pas faire échouer la requête si l'email échoue
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Appointment marked as completed"
    });
  } catch (error) {
    console.error("Error completing appointment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
