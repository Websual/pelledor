import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



// GET: Récupérer tous les avis (pour modération)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // "all", "hidden", "visible", "flagged"
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || ""; // "pending", "reported", "5stars", "verified"
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = 40;
    const skip = (page - 1) * pageSize;

    const whereConditions: any[] = [];

    // Filtre par statut (masqué/visible/signalés)
    if (status === "hidden") {
      whereConditions.push({ is_hidden: true });
    } else if (status === "visible") {
      whereConditions.push({ is_hidden: false });
    } else if (status === "flagged") {
      whereConditions.push({
        OR: [
          { is_flagged: true },
          { flag_count: { gt: 0 } },
        ],
      });
    }

    // Filtre par recherche (praticien, patient, commentaire)
    if (search) {
      whereConditions.push({
        OR: [
          {
            practitioners: {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            users: {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
          {
            comment: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    // Filtres avancés
    if (filter === "pending") {
      whereConditions.push({ response: null });
    } else if (filter === "needsReview") {
      whereConditions.push({ needs_review: true });
    } else if (filter === "5stars") {
      whereConditions.push({ rating: 5 });
    } else if (filter === "verified") {
      whereConditions.push({
        appointment_id: {
          not: null,
        },
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Compter le total avant pagination
    const total = await prisma.reviews.count({ where });

    const reviews = await prisma.reviews.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practitioners: {
          select: {
            id: true,
            title: true,
            location_city: true,
            slug: true,
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
      skip,
      take: pageSize,
    });

    // Transformer les données pour correspondre au format attendu par le frontend
    const transformedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      response: review.response,
      isHidden: review.is_hidden,
      isFlagged: (review as any).is_flagged || false,
      flagCount: (review as any).flag_count ?? 0,
      flagReason: (review as any).flag_reason || null,
      createdAt: review.created_at.toISOString(),
      user: review.users,
      practitioner: {
        id: review.practitioners.id,
        title: review.practitioners.title,
        locationCity: review.practitioners.location_city,
        slug: review.practitioners.slug,
      },
      needsReview: review.needs_review,
      appointment: review.appointments ? {
        id: review.appointments.id,
        startsAt: review.appointments.starts_at.toISOString(),
        service: review.appointments.services,
      } : null,
    }));

    return NextResponse.json({
      reviews: transformedReviews,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

