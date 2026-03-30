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

    const appointments = await prisma.appointments.findMany({
      include: {
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
      orderBy: {
        starts_at: "desc",
      },
    });

    const transformed = appointments.map((apt) => ({
      id: apt.id,
      startsAt: apt.starts_at.toISOString(),
      status: apt.status,
      practitioner: {
        title: apt.practitioners.title,
      },
      user: {
        name: apt.users.name,
        email: apt.users.email,
      },
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

