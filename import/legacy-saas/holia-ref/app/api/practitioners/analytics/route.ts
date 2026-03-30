import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get analytics data
    const [
      totalProfileViews,
      last30DaysProfileViews,
      previous30DaysProfileViews,
      totalBookingClicks,
      last30DaysBookingClicks,
      previous30DaysBookingClicks,
      totalFavorites,
      last30DaysFavorites,
      previous30DaysFavorites,
      searchPositions,
      last30DaysAppointments,
      previous30DaysAppointments,
    ] = await Promise.all([
      // Profile views
      prisma.profile_views.count({
        where: { practitioner_id: practitioner.id },
      }),
      prisma.profile_views.count({
        where: {
          practitioner_id: practitioner.id,
          viewed_at: { gte: thirtyDaysAgo },
        },
      }),
      prisma.profile_views.count({
        where: {
          practitioner_id: practitioner.id,
          viewed_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      // Booking clicks
      prisma.booking_clicks.count({
        where: { practitioner_id: practitioner.id },
      }),
      prisma.booking_clicks.count({
        where: {
          practitioner_id: practitioner.id,
          clicked_at: { gte: thirtyDaysAgo },
        },
      }),
      prisma.booking_clicks.count({
        where: {
          practitioner_id: practitioner.id,
          clicked_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      // Favorites
      prisma.favorites.count({
        where: { practitioner_id: practitioner.id },
      }),
      prisma.favorites.count({
        where: {
          practitioner_id: practitioner.id,
          created_at: { gte: thirtyDaysAgo },
        },
      }),
      prisma.favorites.count({
        where: {
          practitioner_id: practitioner.id,
          created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      // Search positions
      prisma.search_positions.findMany({
        where: { practitioner_id: practitioner.id },
        orderBy: { created_at: "desc" },
        take: 30,
      }),
      // Appointments (last 30 days)
      prisma.appointments.count({
        where: {
          practitioner_id: practitioner.id,
          starts_at: { gte: thirtyDaysAgo },
        },
      }),
      // Appointments (previous 30 days)
      prisma.appointments.count({
        where: {
          practitioner_id: practitioner.id,
          starts_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
    ]);

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const profileViewsTrend = calculateTrend(last30DaysProfileViews, previous30DaysProfileViews);
    const bookingClicksTrend = calculateTrend(last30DaysBookingClicks, previous30DaysBookingClicks);
    const favoritesTrend = calculateTrend(last30DaysFavorites, previous30DaysFavorites);
    const appointmentsTrend = calculateTrend(last30DaysAppointments, previous30DaysAppointments);

    // Taux de conversion = Rendez-vous créés / Vues du profil (30 derniers jours)
    const conversionRate = last30DaysProfileViews > 0
      ? (last30DaysAppointments / last30DaysProfileViews) * 100
      : 0;

    // Position moyenne SEO : 0 pour l'instant (Search Console API plus tard)
    const avgPosition = 0;

    // Calculate click-through rate
    const clickThroughRate = searchPositions.length > 0
      ? (searchPositions.filter((pos) => pos.clicked).length / searchPositions.length) * 100
      : 0;

    // Revenus : somme des practitioner_amount_cents (montant net praticien) des factures payées
    const [totalRevenue, last30DaysRevenue, previous30DaysRevenue] = await Promise.all([
      prisma.$queryRaw<Array<{ sum: bigint | null }>>`
        SELECT SUM(COALESCE(practitioner_amount_cents, total_cents, 0))::bigint as sum
        FROM invoices
        WHERE practitioner_id = ${practitioner.id} AND status = 'paid'
      `,
      prisma.$queryRaw<Array<{ sum: bigint | null }>>`
        SELECT SUM(COALESCE(practitioner_amount_cents, total_cents, 0))::bigint as sum
        FROM invoices
        WHERE practitioner_id = ${practitioner.id}
          AND status = 'paid'
          AND paid_at >= ${thirtyDaysAgo}
      `,
      prisma.$queryRaw<Array<{ sum: bigint | null }>>`
        SELECT SUM(COALESCE(practitioner_amount_cents, total_cents, 0))::bigint as sum
        FROM invoices
        WHERE practitioner_id = ${practitioner.id}
          AND status = 'paid'
          AND paid_at >= ${sixtyDaysAgo}
          AND paid_at < ${thirtyDaysAgo}
      `,
    ]);

    const totalRevenueCents = Number(totalRevenue[0]?.sum ?? 0);
    const last30DaysRevenueCents = Number(last30DaysRevenue[0]?.sum ?? 0);
    const previous30DaysRevenueCents = Number(previous30DaysRevenue[0]?.sum ?? 0);

    const revenueTrend = calculateTrend(
      last30DaysRevenueCents,
      previous30DaysRevenueCents
    );

    // Get views by day (last 30 days)
    const viewsByDayRaw = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT viewed_at::date as date, COUNT(*)::bigint as count
      FROM profile_views
      WHERE practitioner_id = ${practitioner.id}
        AND viewed_at >= ${thirtyDaysAgo}
      GROUP BY viewed_at::date
      ORDER BY date ASC
    `;

    const viewsByDay = viewsByDayRaw.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      views: Number(row.count),
    }));

    // Get clicks by day (last 30 days)
    const clicksByDayRaw = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT clicked_at::date as date, COUNT(*)::bigint as count
      FROM booking_clicks
      WHERE practitioner_id = ${practitioner.id}
        AND clicked_at >= ${thirtyDaysAgo}
      GROUP BY clicked_at::date
      ORDER BY date ASC
    `;

    const clicksByDay = clicksByDayRaw.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      clicks: Number(row.count),
    }));

    // Revenus par jour (30 derniers jours) pour les graphiques
    const revenueByDayRaw = await prisma.$queryRaw<
      Array<{ date: Date; sum: bigint | null }>
    >`
      SELECT paid_at::date as date,
             SUM(COALESCE(practitioner_amount_cents, total_cents, 0))::bigint as sum
      FROM invoices
      WHERE practitioner_id = ${practitioner.id}
        AND status = 'paid'
        AND paid_at >= ${thirtyDaysAgo}
        AND paid_at IS NOT NULL
      GROUP BY paid_at::date
      ORDER BY date ASC
    `;

    const revenueByDay = revenueByDayRaw.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      revenue: Number(row.sum ?? 0),
    }));

    // Rendez-vous par jour (30 derniers jours)
    const appointmentsByDayRaw = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT starts_at::date as date, COUNT(*)::bigint as count
      FROM appointments
      WHERE practitioner_id = ${practitioner.id}
        AND starts_at >= ${thirtyDaysAgo}
        AND status IN ('CONFIRMED', 'DONE')
      GROUP BY starts_at::date
      ORDER BY date ASC
    `;

    const appointmentsByDay = appointmentsByDayRaw.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      appointments: Number(row.count),
    }));

    // Format Recharts : [{ date, views, clicks, revenue, appointments }]
    const allDates = new Set<string>();
    viewsByDay.forEach((d) => allDates.add(d.date));
    clicksByDay.forEach((d) => allDates.add(d.date));
    revenueByDay.forEach((d) => allDates.add(d.date));
    appointmentsByDay.forEach((d) => allDates.add(d.date));

    const sortedDates = Array.from(allDates).sort();
    const chartData = sortedDates.map((dateStr) => {
      const d = new Date(dateStr);
      const dateLabel = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        date: dateStr,
        dateLabel,
        views: viewsByDay.find((v) => v.date === dateStr)?.views ?? 0,
        clicks: clicksByDay.find((c) => c.date === dateStr)?.clicks ?? 0,
        revenue: revenueByDay.find((r) => r.date === dateStr)?.revenue ?? 0,
        appointments:
          appointmentsByDay.find((a) => a.date === dateStr)?.appointments ?? 0,
      };
    });

    return NextResponse.json({
      ratingAvg: practitioner.rating_avg ?? 0,
      profileViews: {
        total: totalProfileViews,
        last30Days: last30DaysProfileViews,
        trend: Math.round(profileViewsTrend * 10) / 10,
      },
      bookingClicks: {
        total: totalBookingClicks,
        last30Days: last30DaysBookingClicks,
        trend: Math.round(bookingClicksTrend * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
      favorites: {
        total: totalFavorites,
        last30Days: last30DaysFavorites,
        trend: Math.round(favoritesTrend * 10) / 10,
      },
      searchPositions: {
        averagePosition: Math.round(avgPosition * 10) / 10,
        appearances: searchPositions.length,
        clickThroughRate: Math.round(clickThroughRate * 10) / 10,
      },
      appointments: {
        total: last30DaysAppointments + previous30DaysAppointments,
        last30Days: last30DaysAppointments,
        trend: Math.round(appointmentsTrend * 10) / 10,
      },
      revenue: {
        totalCents: totalRevenueCents,
        last30DaysCents: last30DaysRevenueCents,
        trend: Math.round(revenueTrend * 10) / 10,
      },
      viewsByDay,
      clicksByDay,
      revenueByDay,
      chartData,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}


