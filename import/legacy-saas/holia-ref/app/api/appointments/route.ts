import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appointmentSchema } from "@/lib/validations";
import { createId } from "@paralleldrive/cuid2";
import { sendBookingConfirmationEmail, sendPractitionerNotificationEmail } from "@/lib/emails";





import { z } from "zod";


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Convert startsAt string to Date if needed
    if (body.startsAt && typeof body.startsAt === "string") {
      body.startsAt = new Date(body.startsAt);
    }
    
    // Extract payment method if provided (for deferred payments)
    const paymentMethod = body.paymentMethod || "stripe";
    const locationChoice = body.locationChoice as "PRESENTIAL" | "VIDEO" | undefined;
    
    const validatedData = appointmentSchema.parse(body);

    // Determine the user_id for the appointment
    let userId: string;
    
    if (session.user.role === "PRACTITIONER") {
      // If practitioner is creating for a client
      if (validatedData.newClient) {
        // Create new client
        const existingUser = await prisma.users.findFirst({
          where: { email: validatedData.newClient.email },
        });

        if (existingUser) {
          // Use existing user
          userId = existingUser.id;
          // Update user info if provided
          if (validatedData.newClient.firstName || validatedData.newClient.lastName || validatedData.newClient.phone) {
            await prisma.users.update({
              where: { id: userId },
              data: {
                name: validatedData.newClient.firstName && validatedData.newClient.lastName
                  ? `${validatedData.newClient.firstName} ${validatedData.newClient.lastName}`
                  : undefined,
                phone: validatedData.newClient.phone || undefined,
              },
            });
          }
        } else {
          // Create new user
          const newUser = await prisma.users.create({
            data: {
              id: createId(),
              name: `${validatedData.newClient.firstName} ${validatedData.newClient.lastName}`,
              email: validatedData.newClient.email,
              phone: validatedData.newClient.phone || null,
            } as any,
          });
          userId = newUser.id;
        }
      } else if (validatedData.userId) {
        // Use provided userId
        userId = validatedData.userId;
      } else {
        return NextResponse.json(
          { error: "userId ou newClient requis pour créer un rendez-vous" },
          { status: 400 }
        );
      }
    } else {
      // Client creating their own appointment
      userId = session.user.id;
    }

    // Get practitioner to check auto-accept and paiement sur place (Premium)
    const practitioner = await prisma.practitioners.findFirst({
      where: { id: validatedData.practitionerId },
      select: {
        auto_accept_appointments: true,
        allow_deferred_payment: true,
        subscription_status: true,
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Paiement sur place autorisé uniquement si Premium + option activée
    if (paymentMethod === "offline") {
      const canOffline =
        (practitioner as any).allow_deferred_payment === true &&
        (practitioner as any).subscription_status === "active";
      if (!canOffline) {
        return NextResponse.json(
          { error: "Le paiement au cabinet n'est pas disponible pour ce praticien." },
          { status: 400 }
        );
      }
    }

    // Get service to check duration
    const service = await prisma.services.findFirst({
      where: { id: validatedData.serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Calculate appointment end time
    const appointmentStart = new Date(validatedData.startsAt);
    const appointmentEnd = new Date(appointmentStart);
    appointmentEnd.setMinutes(appointmentEnd.getMinutes() + service.duration_min);

    // Check if slot overlaps with existing appointments
    const existingAppointments = await prisma.appointments.findMany({
      where: {
        practitioner_id: validatedData.practitionerId,
        status: {
          in: ["CONFIRMED", "PENDING"],
        },
        starts_at: {
          gte: new Date(appointmentStart.getTime() - service.duration_min * 60000),
          lte: appointmentEnd,
        },
      },
      include: {
        services: true,
      },
    });

    // Check for overlaps
    const hasOverlap = existingAppointments.some((appointment) => {
      const existingStart = new Date(appointment.starts_at);
      const existingEnd = new Date(existingStart);
      existingEnd.setMinutes(existingEnd.getMinutes() + appointment.services.duration_min);

      // Check if appointments overlap
      return (
        (appointmentStart >= existingStart && appointmentStart < existingEnd) ||
        (appointmentEnd > existingStart && appointmentEnd <= existingEnd) ||
        (appointmentStart <= existingStart && appointmentEnd >= existingEnd)
      );
    });

    if (hasOverlap) {
      return NextResponse.json(
        { error: "Ce créneau n'est plus disponible" },
        { status: 400 }
      );
    }

    // Check if appointment is in the past
    if (appointmentStart < new Date()) {
      return NextResponse.json(
        { error: "Impossible de réserver un créneau dans le passé" },
        { status: 400 }
      );
    }

    // Determine status: auto-accept if enabled, otherwise PENDING
    const appointmentStatus =
      session.user.role === "PRACTITIONER"
        ? "CONFIRMED" // Practitioners creating appointments always confirm them
        : practitioner.auto_accept_appointments
          ? "CONFIRMED"
          : "PENDING";

    // Paiement sur place (Premium) : payment_status OFFLINE, pas de Stripe
    const paymentStatus =
      paymentMethod === "offline" ? "OFFLINE" : "PENDING";

    const appointment = await prisma.appointments.create({
      data: {
        id: createId(),
        user_id: userId,
        practitioner_id: validatedData.practitionerId,
        service_id: validatedData.serviceId,
        starts_at: validatedData.startsAt,
        status: appointmentStatus,
        payment_status: paymentStatus,
        location_choice: locationChoice || null,
        updated_at: new Date(),
      } as any,
      include: {
        services: {
          select: {
            id: true,
            name: true,
            duration_min: true,
            price_cents: true,
            location_type: true,
          },
        },
        practitioners: {
          select: {
            id: true,
            title: true,
            user_id: true,
            video_link: true,
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
            phone: true,
          },
        },
      },
    });

    // Send email confirmation via SMTP (only if SMTP is configured)
    if (process.env.SMTP_HOST || (process.env.SMTP_USER && process.env.SMTP_PASS)) {
      try {
        // Email de confirmation au client
        const apt = appointment as any;
        await sendBookingConfirmationEmail({
          userName: apt.users?.name || apt.users?.email || "Client",
          practitionerName: apt.practitioners?.users?.name || apt.practitioners?.title || "Praticien",
          serviceName: apt.services?.name || "Service",
          startsAt: apt.starts_at,
          userEmail: apt.users?.email || "",
          cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/account/appointments`,
          locationChoice: apt.location_choice || null,
          videoLink: apt.practitioners?.video_link || null,
        });
      } catch (emailError) {
        console.error("Error sending booking confirmation email:", emailError);
        // Don't fail the appointment creation if email fails
      }

      try {
        // Email de notification au praticien
        const apt = appointment as any;
        await sendPractitionerNotificationEmail({
          practitionerName: apt.practitioners?.users?.name || apt.practitioners?.title || "Praticien",
          clientName: apt.users?.name || apt.users?.email || "Client",
          serviceName: apt.services?.name || "Service",
          startsAt: apt.starts_at,
          practitionerEmail: apt.practitioners?.users?.email || "",
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3005"}/pro/appointments`,
          clientPhone: appointment.users.phone || null,
        });
      } catch (emailError) {
        console.error("Error sending practitioner notification email:", emailError);
        // Don't fail the appointment creation if email fails
      }
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation error", 
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const practitionerId = searchParams.get("practitionerId");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    const where: any = {};

    if (session.user.role === "PRACTITIONER") {
      const practitioner = await prisma.practitioners.findFirst({
        where: { user_id: session.user.id },
      });
      if (practitioner) {
        where.practitioner_id = practitioner.id;
      }
    } else if (session.user.role === "CLIENT") {
      where.user_id = session.user.id;
    } else if (userId) {
      where.user_id = userId;
    } else if (practitionerId) {
      where.practitioner_id = practitionerId;
      // Si un practitionerId est fourni et que l'utilisateur est un client, filtrer par user_id aussi
      if (session.user.role === "CLIENT") {
        where.user_id = session.user.id;
      }
    }

    // Filtrer par statut si fourni
    if (status) {
      where.status = status;
    }

    const appointments = (await prisma.appointments.findMany({
      where,
      include: {
        services: true,
        practitioners: {
          select: {
            id: true,
            title: true,
            location_city: true,
            address: true,
            access_info: true,
            lat: true,
            lng: true,
            photo_url: true,
            slug: true,
            video_link: true,
            professions: {
              select: {
                name: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        reviews: true,
        invoices: {
          where: {
            payment_method: "stripe",
            OR: [
              { status: "paid" },
              { status: "PAID" },
              { paid_at: { not: null } },
              { stripe_payment_intent_id: { not: null } },
            ],
          },
          take: 1,
          orderBy: { created_at: "desc" },
          select: {
            amount_cents: true,
            practitioner_amount_cents: true,
            platform_fee_cents: true,
            stripe_processing_fee_cents: true,
          },
        },
      },
      orderBy: {
        starts_at: "desc",
      },
    })) as any;

    // Filtrer les rendez-vous qui n'ont pas de service (données corrompues)
    // Cela ne devrait jamais arriver avec onDelete: Cascade, mais on se protège au cas où
    const validAppointments = appointments.filter((apt: any) => apt.services !== null);
    
    if (appointments.length !== validAppointments.length) {
      console.warn(
        `[Appointments API] Found ${appointments.length - validAppointments.length} appointments without service. This should not happen with onDelete: Cascade.`
      );
    }

    // Synchroniser le payment_status avec les factures Stripe si nécessaire
    // Si un rendez-vous a une facture Stripe payée mais payment_status n'est pas PAID, le mettre à jour
    const appointmentsToSync = validAppointments.filter((apt: any) => 
      apt.payment_status !== "PAID" && apt.status === "CONFIRMED"
    );
    
    if (appointmentsToSync.length > 0) {
      const appointmentIds = appointmentsToSync.map((apt: any) => apt.id);
      
      // Chercher les factures payées (status peut être "paid" ou "PAID", et payment_method doit être "stripe")
      // On vérifie aussi si paid_at n'est pas null comme indicateur supplémentaire
      // Ou si stripe_payment_intent_id existe (indique qu'un paiement Stripe a été traité)
      const paidInvoices = await prisma.invoices.findMany({
        where: {
          appointment_id: { in: appointmentIds },
          payment_method: "stripe",
          OR: [
            { status: "paid" },
            { status: "PAID" },
            { paid_at: { not: null } }, // Si paid_at existe, c'est qu'elle est payée
            { stripe_payment_intent_id: { not: null } }, // Si un payment_intent existe, c'est qu'un paiement a été traité
          ],
        },
        select: {
          appointment_id: true,
          status: true,
          paid_at: true,
          stripe_payment_intent_id: true,
        },
      });
      
      console.log(`[Appointments API] Found ${paidInvoices.length} paid invoices for ${appointmentsToSync.length} appointments to sync`);
      
      const paidAppointmentIds = new Set(
        paidInvoices
          .filter((inv) => inv.appointment_id)
          .map((inv) => inv.appointment_id!)
      );
      
      // Mettre à jour les rendez-vous qui ont une facture payée
      if (paidAppointmentIds.size > 0) {
        console.log(`[Appointments API] Updating payment_status to PAID for appointments: ${Array.from(paidAppointmentIds).join(", ")}`);
        
        const updateResult = await prisma.appointments.updateMany({
          where: {
            id: { in: Array.from(paidAppointmentIds) },
            payment_status: { not: "PAID" },
          },
          data: {
            payment_status: "PAID",
            updated_at: new Date(),
          },
        });
        
        console.log(`[Appointments API] Updated ${updateResult.count} appointments with payment_status = PAID`);
        
        // Mettre à jour les données en mémoire pour cette requête
        validAppointments.forEach((apt: any) => {
          if (paidAppointmentIds.has(apt.id)) {
            apt.payment_status = "PAID";
          }
        });
      }
    }

    // Pour les clients : compter les messages non lus du praticien (via notifications MESSAGE_RECEIVED)
    let unreadByAppointment: Record<string, number> = {};
    if (session.user.role === "CLIENT") {
      const unreadNotifications = await prisma.notifications.findMany({
        where: {
          user_id: session.user.id,
          type: "MESSAGE_RECEIVED",
          read: false,
        },
        select: { metadata: true },
      });
      unreadByAppointment = unreadNotifications.reduce<Record<string, number>>((acc, n) => {
        const meta = n.metadata as { appointmentId?: string } | null;
        if (meta?.appointmentId) {
          acc[meta.appointmentId] = (acc[meta.appointmentId] || 0) + 1;
        }
        return acc;
      }, {});
    }

    // Transformer les données pour le frontend
    // Pour les RDV payés : utiliser amount_cents de la facture (montant réel avec promo)
    const transformed = validAppointments.map((apt: any) => {
      const paidInvoice = apt.invoices?.[0];
      // Montant réel payé = net + commission + frais Stripe (avec promos)
      // amount_cents peut être faux sur anciennes factures
      const hasFeeBreakdown = paidInvoice?.practitioner_amount_cents != null &&
        paidInvoice?.platform_fee_cents != null &&
        paidInvoice?.stripe_processing_fee_cents != null;
      const derivedTotalCents = hasFeeBreakdown
        ? paidInvoice.practitioner_amount_cents + paidInvoice.platform_fee_cents + paidInvoice.stripe_processing_fee_cents
        : null;
      const displayPriceCents = apt.payment_status === "PAID" && (derivedTotalCents ?? paidInvoice?.amount_cents) != null
        ? (derivedTotalCents ?? paidInvoice.amount_cents)
        : apt.services?.price_cents ?? 0;
      return {
      id: apt.id,
      startsAt: apt.starts_at.toISOString(),
      starts_at: apt.starts_at.toISOString(),
      status: apt.status,
      payment_status: apt.payment_status,
      locationChoice: apt.location_choice || null,
      service: apt.services ? {
        id: apt.services.id,
        name: apt.services.name,
        durationMin: apt.services.duration_min,
        duration_min: apt.services.duration_min,
        priceCents: displayPriceCents,
        price_cents: displayPriceCents,
        locationType: apt.services.location_type || null,
      } : null,
      services: apt.services ? {
        id: apt.services.id,
        name: apt.services.name,
        duration_min: apt.services.duration_min,
        price_cents: apt.services.price_cents,
        location_type: apt.services.location_type || null,
      } : null,
      practitioner: apt.practitioners ? {
        id: apt.practitioners.id,
        title: apt.practitioners.title || "",
        locationCity: apt.practitioners.location_city || "",
        address: apt.practitioners.address || null,
        accessInfo: apt.practitioners.access_info || null,
        locationLat: apt.practitioners.lat || null,
        locationLng: apt.practitioners.lng || null,
        photoUrl: apt.practitioners.photo_url || null,
        slug: apt.practitioners.slug || null,
        professionName: apt.practitioners.professions?.name || null,
        videoLink: apt.practitioners.video_link || null,
      } : null,
      users: apt.users ? {
        id: apt.users.id,
        name: apt.users.name,
        email: apt.users.email,
        phone: apt.users.phone,
      } : null,
      reviews: apt.reviews || [],
      unreadMessagesFromPractitioner: unreadByAppointment[apt.id] || 0,
    };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
