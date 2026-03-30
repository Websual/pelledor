import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[Admin Dashboard API] Starting data fetch for admin:", session.user.id);

    // Statistiques générales
    console.log("[Admin Dashboard API] Starting Prisma queries...");
    
    const [
      totalPractitioners,
      verifiedPractitioners,
      pendingPractitioners,
      suspendedPractitioners,
      totalUsers,
      totalAppointments,
      totalReviews,
      reviewsWithRating,
      recentPractitioners,
      recentAppointments,
      subscriptions,
      appointmentsWithRevenue,
      profileViews,
      bookingClicks,
    ] = await Promise.all([
      prisma.practitioners.count(),
      prisma.practitioners.count({ where: { is_verified: true, is_active: true } }),
      prisma.practitioners.count({ where: { is_verified: false, is_active: false } }),
      prisma.practitioners.count({ where: { is_active: false } }),
      prisma.users.count(),
      prisma.appointments.count(),
      prisma.reviews.count({ where: { is_hidden: false } }),
      prisma.reviews.findMany({
        where: { is_hidden: false },
        select: { rating: true },
        take: 10000, // Limite pour éviter de charger toutes les reviews
      }),
      prisma.practitioners.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          title: true,
          location_city: true,
          is_verified: true,
          is_active: true,
          created_at: true,
          users: {
            select: {
              email: true,
            },
          },
        },
      }),
      prisma.appointments.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          starts_at: true,
          status: true,
          created_at: true,
          practitioners: {
            select: {
              title: true,
            },
          },
          users: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      // MRR: Revenus récurrents (abonnements Premium)
      // On compte seulement, pas besoin de charger tous les IDs
      prisma.practitioners.count({
        where: {
          subscription_status: "active",
        },
      }),
      // GMV: Volume total des réservations payées
      // Limiter à une période récente pour éviter de charger toutes les données
      prisma.appointments.findMany({
        where: {
          status: "DONE",
          created_at: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Dernière année seulement
          },
        },
        select: {
          id: true,
          services: {
            select: {
              price_cents: true,
            },
          },
        },
        take: 10000, // Limite de sécurité
      }),
      // Profile views et booking clicks pour conversion rate
      prisma.profile_views.count().catch((err) => {
        console.error("[Admin Dashboard API] Error counting profile_views:", err);
        return 0;
      }),
      prisma.booking_clicks.count().catch((err) => {
        console.error("[Admin Dashboard API] Error counting booking_clicks:", err);
        return 0;
      }),
    ]);
    
    console.log("[Admin Dashboard API] Prisma queries completed successfully");

    // Calculer MRR (simplifié: 59€/mois par praticien Premium)
    // subscriptions est maintenant un count, pas un array
    const mrr = subscriptions * 59;

    // Calculer GMV (somme de tous les prix des services des RDV terminés)
    const gmv = appointmentsWithRevenue.reduce(
      (sum, apt) => {
        // services est une relation unique (one-to-many), donc c'est un objet unique
        const price = apt.services?.price_cents;
        return sum + (typeof price === 'number' && !isNaN(price) ? price : 0);
      },
      0
    ) / 100;

    // Calculer le taux de conversion (clics sur réservation / vues de profil)
    const conversionRate =
      profileViews > 0 && typeof bookingClicks === 'number' && typeof profileViews === 'number'
        ? ((bookingClicks / profileViews) * 100).toFixed(1)
        : "0.0";

    // Compter les avis signalés (pour l'instant, on compte ceux qui sont cachés)
    const reportedReviews = await prisma.reviews.count({
      where: {
        is_hidden: true,
      },
    });

    // Générer l'activité récente
    const recentActivity = [
      ...recentAppointments.slice(0, 5).map((apt) => ({
        type: "booking",
        message: `Nouvelle réservation: ${apt.users?.name || apt.users?.email || 'Client'} avec ${apt.practitioners?.title || 'Praticien'}`,
        timestamp: apt.starts_at ? apt.starts_at.toISOString() : apt.created_at.toISOString(),
      })),
      ...recentPractitioners.slice(0, 3).map((p) => ({
        type: "user",
        message: `Nouveau praticien: ${p.title} à ${p.location_city}`,
        timestamp: p.created_at.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    // Calculer la note moyenne
    const averageRating =
      reviewsWithRating.length > 0
        ? reviewsWithRating.reduce((sum, r) => sum + r.rating, 0) / reviewsWithRating.length
        : 0;

    // Compter les praticiens en attente de vérification (non vérifiés et non actifs)
    const pendingVerifications = await prisma.practitioners.count({
      where: {
        is_verified: false,
        is_active: false,
      },
    });

    // Transformer les données
    const transformed = {
      totalPractitioners,
      verifiedPractitioners,
      pendingPractitioners,
      suspendedPractitioners,
      totalUsers,
      totalAppointments,
      totalReviews,
      averageRating,
      pendingVerifications,
      mrr,
      gmv,
      conversionRate: parseFloat(conversionRate),
      reportedReviews,
      recentPractitioners: recentPractitioners.map((p) => ({
        id: p.id,
        title: p.title,
        locationCity: p.location_city,
        isVerified: p.is_verified,
        isActive: p.is_active,
        createdAt: p.created_at.toISOString(),
        user: p.users ? {
          email: p.users.email,
        } : null,
      })),
      recentAppointments: recentAppointments.map((apt) => ({
        id: apt.id,
        startsAt: apt.starts_at ? apt.starts_at.toISOString() : apt.created_at.toISOString(),
        status: apt.status,
        practitioner: {
          title: apt.practitioners?.title || "Praticien",
        },
        user: {
          name: apt.users?.name || null,
          email: apt.users?.email || "",
        },
      })),
      recentActivity,
    };

    console.log("[Admin Dashboard API] Data fetch completed successfully");
    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[Admin Dashboard API] Error fetching admin dashboard:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[Admin Dashboard API] Error details:", { errorMessage, errorStack });
    
    // Toujours retourner une réponse JSON, même en cas d'erreur
    return NextResponse.json(
      { 
        error: "Failed to fetch dashboard data",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

