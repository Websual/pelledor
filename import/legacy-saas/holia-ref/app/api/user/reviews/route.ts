import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Récupérer les avis de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviews = await prisma.reviews.findMany({
      where: {
        user_id: session.user.id,
        is_hidden: false,
      },
      include: {
        practitioners: {
          select: {
            id: true,
            title: true,
            slug: true,
            photo_url: true,
            location_city: true,
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

    // Transformer les données pour correspondre à l'interface frontend
    const transformedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      response: review.response,
      createdAt: review.created_at.toISOString(),
      updatedAt: review.updated_at.toISOString(),
      practitioner: {
        id: review.practitioners.id,
        title: review.practitioners.title,
        slug: review.practitioners.slug,
        photoUrl: review.practitioners.photo_url,
        locationCity: review.practitioners.location_city,
      },
      appointment: review.appointments
        ? {
            id: review.appointments.id,
            startsAt: review.appointments.starts_at.toISOString(),
            service: {
              id: review.appointments.services.id,
              name: review.appointments.services.name,
            },
          }
        : null,
    }));

    return NextResponse.json(transformedReviews);
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
