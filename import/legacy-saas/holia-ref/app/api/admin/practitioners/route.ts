import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";



// GET: Récupérer tous les praticiens (pour validation)
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
    const status = searchParams.get("status"); // "pending", "verified", "all", "pending_siret", "documents_to_verify"
    const search = searchParams.get("search") || ""; // Recherche par nom, email ou SIRET
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filtres par statut
    if (status === "pending") {
      where.is_verified = false;
    } else if (status === "verified") {
      where.is_verified = true;
    } else if (status === "pending_siret") {
      // En attente SIRET : non vérifiés automatiquement (pas de SIRET ou SIRET non vérifié)
      where.is_verified = false;
      where.OR = [
        { siret: null },
        { siret: "" },
      ];
    } else if (status === "documents_to_verify") {
      // Documents à vérifier : vérifiés mais avec nouveaux documents uploadés
      where.is_verified = true;
      where.OR = [
        { diploma_document_url: { not: null }, diploma_verified: false },
        { kbis_document_url: { not: null }, kbis_verified: false },
        { rcp_document_url: { not: null }, rcp_verified: false },
      ];
    }

    // Recherche par nom, email ou SIRET
    if (search.trim()) {
      const searchTerm = search.trim();
      const searchConditions = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { first_name: { contains: searchTerm, mode: "insensitive" } },
        { last_name: { contains: searchTerm, mode: "insensitive" } },
        { siret: { contains: searchTerm } },
        { users: { email: { contains: searchTerm, mode: "insensitive" } } },
        { users: { name: { contains: searchTerm, mode: "insensitive" } } },
      ];

      // Si on a déjà un OR dans where (pour les filtres), on doit combiner avec AND
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Compter le total pour la pagination
    const total = await prisma.practitioners.count({ where });

    const practitioners = await prisma.practitioners.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        bio: true,
        location_city: true,
        photo_url: true,
        is_verified: true,
        is_active: true,
        rating_avg: true,
        created_at: true,
        siret: true,
        diploma_document_url: true,
        diploma_verified: true,
        kbis_document_url: true,
        kbis_verified: true,
        rcp_document_url: true,
        rcp_verified: true,
        is_claimed: true,
        stripe_account_id: true,
        stripe_onboarding_complete: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            created_at: true,
            accounts: {
              where: { provider: "google-calendar" },
              select: { id: true, refresh_token: true },
            },
          },
        },
        professions: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            duration_min: true,
            price_cents: true,
          },
        },
        _count: {
          select: {
            appointments: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Stripe Connect status pour chaque praticien avec stripe_account_id
    const stripeStatuses = await Promise.allSettled(
      practitioners
        .filter((p) => p.stripe_account_id)
        .map(async (p) => {
          const account = await stripe.accounts.retrieve(p.stripe_account_id!);
          return {
            id: p.id,
            charges_enabled: account.charges_enabled ?? false,
            details_submitted: account.details_submitted ?? false,
          };
        })
    );
    const stripeById: Record<string, { charges_enabled: boolean; details_submitted: boolean }> = {};
    stripeStatuses.forEach((result) => {
      if (result.status === "fulfilled") {
        stripeById[result.value.id] = {
          charges_enabled: result.value.charges_enabled,
          details_submitted: result.value.details_submitted,
        };
      }
    });

    // Transformer les données en camelCase pour le frontend
    const transformed = practitioners.map((p) => {
      const stripeStatus = stripeById[p.id];
      let stripeConnectStatus: "charges_enabled" | "details_submitted" | "none" = "none";
      if (stripeStatus) {
        if (stripeStatus.charges_enabled) stripeConnectStatus = "charges_enabled";
        else if (stripeStatus.details_submitted) stripeConnectStatus = "details_submitted";
      }
      const googleCalendarValid =
        !!p.users?.accounts?.length &&
        p.users.accounts.some((a) => !!a.refresh_token);
      return {
        id: p.id,
        title: p.title,
        bio: p.bio || "",
        locationCity: p.location_city,
        photoUrl: p.photo_url,
        isVerified: p.is_verified,
        isActive: p.is_active,
        ratingAvg: p.rating_avg || 0,
        createdAt: p.created_at.toISOString(),
        siret: p.siret,
        diplomaDocumentUrl: p.diploma_document_url,
        diplomaVerified: p.diploma_verified,
        kbisDocumentUrl: p.kbis_document_url,
        kbisVerified: p.kbis_verified,
        rcpDocumentUrl: p.rcp_document_url,
        rcpVerified: p.rcp_verified,
        isClaimed: p.is_claimed,
        googleCalendarValid,
        stripeConnectStatus,
        user: p.users ? {
          id: p.users.id,
          name: p.users.name,
          email: p.users.email,
          phone: p.users.phone,
          createdAt: p.users.created_at.toISOString(),
        } : null,
        profession: p.professions ? {
          id: p.professions.id,
          name: p.professions.name,
          slug: p.professions.slug,
        } : null,
        services: p.services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.duration_min,
          priceCents: s.price_cents,
        })),
        _count: {
          appointments: p._count.appointments,
          reviews: p._count.reviews,
        },
      };
    });

    return NextResponse.json({
      practitioners: transformed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching practitioners:", error);
    return NextResponse.json(
      { error: "Failed to fetch practitioners" },
      { status: 500 }
    );
  }
}

