import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



// GET: Récupérer tous les avis du praticien
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Trouver le praticien associé à l'utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Récupérer les avis du praticien
    const reviews = await prisma.reviews.findMany({
      where: {
        practitioner_id: practitioner.id,
        is_hidden: false,
      },
      select: {
        id: true,
        appointment_id: true,
        rating: true,
        comment: true,
        response: true,
        created_at: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        appointments: {
          select: {
            id: true,
            starts_at: true,
            services: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

