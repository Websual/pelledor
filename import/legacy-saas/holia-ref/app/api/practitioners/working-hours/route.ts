import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";




// GET - Récupérer les horaires de travail du praticien
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      include: { working_hours: true },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Sort by day_of_week (1-7) and then by start_time
    const sortedHours = practitioner.working_hours.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week;
      }
      return a.start_time.localeCompare(b.start_time);
    });

    return NextResponse.json(sortedHours);
  } catch (error) {
    console.error("Error fetching working hours:", error);
    return NextResponse.json(
      { error: "Failed to fetch working hours" },
      { status: 500 }
    );
  }
}

// POST - Créer ou mettre à jour les horaires de travail
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dayOfWeek, startTime, endTime, isActive } = body;

    if (
      typeof dayOfWeek !== "number" ||
      dayOfWeek < 1 ||
      dayOfWeek > 7 ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        { error: "Invalid working hours data" },
        { status: 400 }
      );
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

    // Create working hours (allow multiple ranges per day)
    const workingHours = await prisma.working_hours.create({
      data: {
        id: createId(),
        practitioner_id: practitioner.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_active: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(workingHours);
  } catch (error) {
    console.error("Error saving working hours:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error("Error details:", errorDetails);
    return NextResponse.json(
      { 
        error: "Failed to save working hours",
        details: errorMessage,
        ...(process.env.NODE_ENV === "development" && { stack: errorDetails })
      },
      { status: 500 }
    );
  }
}

