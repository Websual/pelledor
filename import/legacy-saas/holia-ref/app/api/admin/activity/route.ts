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

    // Récupérer les activités récentes
    const [recentAppointments, recentPractitioners, recentUsers] = await Promise.all([
      prisma.appointments.findMany({
        take: 20,
        orderBy: { created_at: "desc" },
        include: {
          practitioners: { select: { title: true } },
          users: { select: { name: true, email: true } },
        },
      }),
      prisma.practitioners.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        select: { title: true, location_city: true, created_at: true },
      }),
      prisma.users.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        select: { name: true, email: true, created_at: true },
      }),
    ]);

    const activities = [
      ...recentAppointments.map((apt) => ({
        type: "booking",
        message: `Nouvelle réservation: ${apt.users.name || apt.users.email} avec ${apt.practitioners.title}`,
        timestamp: apt.created_at.toISOString(),
      })),
      ...recentPractitioners.map((p) => ({
        type: "practitioner",
        message: `Nouveau praticien: ${p.title} à ${p.location_city}`,
        timestamp: p.created_at.toISOString(),
      })),
      ...recentUsers.map((u) => ({
        type: "user",
        message: `Nouvel utilisateur: ${u.name || u.email}`,
        timestamp: u.created_at.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

