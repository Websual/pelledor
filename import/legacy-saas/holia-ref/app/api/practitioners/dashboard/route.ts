import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeeBreakdown } from "@/lib/stripe-fees";


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");

    let practitioner: { id: string; subscription_status: string | null; [key: string]: any } | null;

    if (session.user.role === "ADMIN" && viewAs) {
      practitioner = await prisma.practitioners.findUnique({
        where: { id: viewAs },
      });
      if (!practitioner) {
        return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
      }
    } else if (session.user.role === "PRACTITIONER") {
      practitioner = await prisma.practitioners.findFirst({
        where: { user_id: session.user.id },
      });
      if (!practitioner) {
        return NextResponse.json(
          { error: "Practitioner not found" },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculer les dates pour les statistiques
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lundi
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Récupérer les statistiques en parallèle
    const [
      totalAppointments,
      confirmedAppointments,
      canceledAppointments,
      doneAppointments,
      todayAppointmentsCount,
      upcomingAppointments,
      averageRatingResult,
      totalReviews,
      monthAppointments,
      weekAppointments,
      monthRevenue,
      weekRevenue,
      totalRevenue,
    ] = await Promise.all([
      // Total des rendez-vous
      prisma.appointments.count({
        where: { practitioner_id: practitioner.id },
      }),
      // Rendez-vous confirmés
      prisma.appointments.count({
        where: {
          practitioner_id: practitioner.id,
          status: "CONFIRMED",
        },
      }),
      // Rendez-vous annulés
      prisma.appointments.count({
        where: {
          practitioner_id: practitioner.id,
          status: "CANCELED",
        },
      }),
      // Rendez-vous terminés
      prisma.appointments.count({
        where: {
          practitioner_id: practitioner.id,
          status: "DONE",
        },
      }),
      // Nombre de rendez-vous d'aujourd'hui
      prisma.appointments.count({
        where: {
          practitioner_id: practitioner.id,
          status: "CONFIRMED",
          starts_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      // Prochains rendez-vous (limité à 10)
      prisma.appointments.findMany({
        where: {
          practitioner_id: practitioner.id,
          status: "CONFIRMED",
          starts_at: {
            gte: new Date(),
          },
        },
        include: {
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
              phone: true,
            },
          },
        },
        orderBy: {
          starts_at: "asc",
        },
        take: 10,
      }),
      // Note moyenne
      prisma.reviews.aggregate({
        where: {
          practitioner_id: practitioner.id,
          is_hidden: false,
        },
        _avg: {
          rating: true,
        },
      }),
      // Nombre total d'avis
      prisma.reviews.count({
        where: {
          practitioner_id: practitioner.id,
          is_hidden: false,
        },
      }),
      // Rendez-vous du mois
      prisma.appointments.findMany({
        where: {
          practitioner_id: practitioner.id,
          status: {
            in: ["CONFIRMED", "DONE"],
          },
          starts_at: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        include: {
          services: {
            select: {
              price_cents: true,
            },
          },
        },
      }),
      // Rendez-vous de la semaine
      prisma.appointments.findMany({
        where: {
          practitioner_id: practitioner.id,
          status: {
            in: ["CONFIRMED", "DONE"],
          },
          starts_at: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
        include: {
          services: {
            select: {
              price_cents: true,
            },
          },
        },
      }),
      // Revenus du mois (uniquement les rendez-vous payés)
      prisma.appointments.findMany({
        where: {
          practitioner_id: practitioner.id,
          payment_status: "PAID",
          status: {
            not: "CANCELED", // Exclure les rendez-vous annulés
          },
          starts_at: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        } as any,
        include: {
          services: {
            select: {
              price_cents: true,
            },
          },
        },
      }),
      // Revenus de la semaine (uniquement les rendez-vous payés)
      prisma.appointments.findMany({
        where: {
          practitioner_id: practitioner.id,
          payment_status: "PAID",
          status: {
            not: "CANCELED", // Exclure les rendez-vous annulés
          },
          starts_at: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        } as any,
        include: {
          services: {
            select: {
              price_cents: true,
            },
          },
        },
      }),
      // Revenus totaux (uniquement les rendez-vous payés)
      prisma.appointments.findMany({
        where: {
          practitioner_id: practitioner.id,
          payment_status: "PAID",
          status: {
            not: "CANCELED", // Exclure les rendez-vous annulés
          },
        } as any,
        include: {
          services: {
            select: {
              price_cents: true,
            },
          },
        },
      }),
    ]);

    // Rendez-vous d'aujourd'hui avec détails
    const todayAppointmentsDetails = await prisma.appointments.findMany({
      where: {
        practitioner_id: practitioner.id,
        status: "CONFIRMED",
        starts_at: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: {
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
            phone: true,
          },
        },
      },
      orderBy: {
        starts_at: "asc",
      },
    });

    // Calculer les revenus en utilisant le MONTANT NET (après frais)
    // Pour chaque rendez-vous payé, on calcule le montant net = prix - commission Holia - frais Stripe
    const calculateNetRevenue = (appointments: Array<{ services: { price_cents: number } | null }>) => {
      return appointments.reduce((sum, apt) => {
        const servicePrice = apt.services?.price_cents || 0;
        if (servicePrice === 0) return sum;
        const breakdown = getFeeBreakdown(servicePrice, practitioner?.subscription_status || "free");
        return sum + breakdown.netAmountCents;
      }, 0);
    };

    const monthRevenueCents = calculateNetRevenue(monthRevenue);
    const weekRevenueCents = calculateNetRevenue(weekRevenue);
    const totalRevenueCents = calculateNetRevenue(totalRevenue);

    // Calculer le taux de remplissage (nombre de créneaux occupés / créneaux totaux possibles)
    // Pour simplifier, on calcule le taux de remplissage du mois
    // En théorie, on devrait compter les créneaux disponibles vs occupés
    const monthOccupiedSlots = monthAppointments.length;
    // Estimation : 9h-18h = 9 heures = 18 créneaux de 30 min par jour
    // 30 jours = 540 créneaux maximum par mois
    const maxSlotsPerMonth = 540;
    const fillRate = monthOccupiedSlots > 0 
      ? Math.min((monthOccupiedSlots / maxSlotsPerMonth) * 100, 100)
      : 0;

    // Calculer le taux d'annulation
    const cancellationRate = totalAppointments > 0
      ? (canceledAppointments / totalAppointments) * 100
      : 0;

    // Calculer le taux de complétion
    const completionRate = totalAppointments > 0
      ? (doneAppointments / totalAppointments) * 100
      : 0;

    // Get additional analytics data
    const [
      profileViews,
      bookingClicks,
      favorites,
      unreadMessages,
      pendingInvoices,
      servicesCount,
      uniqueWorkingDays,
      qualificationsCount,
    ] = await Promise.all([
      prisma.profile_views.count({
        where: { practitioner_id: practitioner.id },
      }),
      prisma.booking_clicks.count({
        where: { practitioner_id: practitioner.id },
      }),
      prisma.favorites.count({
        where: { practitioner_id: practitioner.id },
      }),
      // TODO: Add read status to messages model
      // For now, return 0 as placeholder
      Promise.resolve(0),
      prisma.invoices.count({
        where: {
          practitioner_id: practitioner.id,
          status: "draft",
        },
      }),
      prisma.services.count({
        where: { practitioner_id: practitioner.id },
      }),
      // Récupérer toutes les plages horaires actives pour calculer le nombre de demi-journées
      prisma.working_hours.findMany({
        where: { practitioner_id: practitioner.id, is_active: true },
        select: { day_of_week: true },
      }),
      prisma.qualifications.count({
        where: { practitioner_id: practitioner.id },
      }),
    ]);

    // Calculate profile completion percentage (same logic as in profile page)
    let completionFilled = 0;
    let completionTotal = 0;
    const missingFields: string[] = [];

    // Identity fields (5)
    completionTotal += 5;
    if (practitioner.title) completionFilled++; else missingFields.push("title");
    if (practitioner.bio) completionFilled++; else missingFields.push("bio");
    if (practitioner.address) completionFilled++; else missingFields.push("address");
    if (practitioner.location_city) completionFilled++; else missingFields.push("location_city");
    if (practitioner.phone) completionFilled++; else missingFields.push("phone");

    // Media (2)
    completionTotal += 2;
    if (practitioner.photo_url) completionFilled++; else missingFields.push("photo_url");
    // Vérifier gallery : peut être null, undefined, ou un tableau vide
    const hasGallery = Array.isArray(practitioner.gallery) && practitioner.gallery.length > 0;
    if (hasGallery) completionFilled++; else missingFields.push("gallery");

    // Expertise (3)
    completionTotal += 3;
    const hasKeywords = Array.isArray(practitioner.treatment_keywords) && practitioner.treatment_keywords.length > 0;
    if (hasKeywords) completionFilled++; else missingFields.push("treatment_keywords");
    if (qualificationsCount > 0) completionFilled++; else missingFields.push("qualifications");
    if (practitioner.profession_id) completionFilled++; else missingFields.push("profession_id");

    // Services (1)
    completionTotal += 1;
    if (servicesCount > 0) completionFilled++; else missingFields.push("services");

    // Hours (1) - Compter les jours uniques avec des horaires pour la complétion
    completionTotal += 1;
    const uniqueDaysWithHours = new Set(uniqueWorkingDays.map((wh: any) => wh.day_of_week)).size;
    if (uniqueDaysWithHours > 0) completionFilled++; else missingFields.push("working_hours");
    
    // Calculer le nombre de jours (en demi-journées) : nombre total de plages horaires / 2
    const totalTimeSlots = uniqueWorkingDays.length;
    const daysCount = totalTimeSlots / 2; // 1 jour = 2 demi-journées

    const completionPercentage = Math.round((completionFilled / completionTotal) * 100);
    
    // Log pour déboguer (seulement si pas 100%)
    if (completionPercentage < 100) {
      console.log(`[Dashboard Completion] ${completionPercentage}% (${completionFilled}/${completionTotal}) - Missing:`, missingFields);
    }

    const response: Record<string, unknown> = {
      totalAppointments,
      confirmedAppointments,
      canceledAppointments,
      doneAppointments,
      pendingAppointments: confirmedAppointments - todayAppointmentsCount,
      averageRating: averageRatingResult._avg.rating || 0,
      totalReviews,
      todayAppointments: todayAppointmentsDetails,
      upcomingAppointments,
      monthAppointments: monthAppointments.length,
      monthRevenueCents,
      weekAppointments: weekAppointments.length,
      weekRevenueCents,
      totalRevenueCents,
      fillRate: Math.round(fillRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      profileViews,
      bookingClicks,
      favorites,
      unreadMessages,
      pendingInvoices,
      isVerified: practitioner.is_verified,
      completionPercentage,
      servicesCount,
      workingHoursCount: uniqueDaysWithHours,
      workingHoursDaysCount: daysCount,
      stripeAccountId: practitioner.stripe_account_id,
      stripeOnboardingComplete: practitioner.stripe_onboarding_complete || false,
      slug: practitioner.slug,
    };
    if (session.user.role === "ADMIN" && viewAs) {
      response.simulatedPractitionerName = practitioner.title || "Praticien";
      response.simulatedPractitionerId = practitioner.id;
    }
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
