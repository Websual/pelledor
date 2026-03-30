import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const city = searchParams.get("city")?.trim() || undefined;
    const professionId = searchParams.get("professionId")?.trim() || undefined;
    const completionScore = searchParams.get("completionScore"); // "all" | "0" | "1" | "2"
    const hasEmail = searchParams.get("hasEmail") === "true";

    const where: any = {
      user_id: null,
      is_claimed: false,
    };

    if (city) {
      where.location_city = { contains: city, mode: "insensitive" };
    }

    if (professionId) {
      where.profession_id = professionId;
    }

    if (completionScore === "2") {
      where.AND = [
        { photo_url: { not: null } },
        { bio: { not: null } },
        { bio: { not: "" } },
      ];
    } else if (completionScore === "1") {
      where.OR = [
        { photo_url: { not: null }, bio: { equals: "" } },
        {
          AND: [
            { photo_url: null },
            { bio: { not: null } },
            { bio: { not: "" } },
          ],
        },
      ];
    } else if (completionScore === "0") {
      where.AND = [
        { OR: [{ photo_url: null }, { photo_url: "" }] },
        { OR: [{ bio: null }, { bio: "" }] },
      ];
    }

    if (hasEmail) {
      const emailCondition = { AND: [{ contact_email: { not: null } }, { contact_email: { not: "" } }] };
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), emailCondition];
    }

    const [prospects, filteredCount, totalProspects, invitationsSent, claimsCount, professions] =
      await Promise.all([
        prisma.practitioners.findMany({
          where,
          include: {
            professions: { select: { id: true, name: true } },
          },
          orderBy: { updated_at: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.practitioners.count({ where }),
        prisma.practitioners.count({
          where: { user_id: null, is_claimed: false },
        }),
        prisma.practitioners.count({
          where: {
            user_id: null,
            is_claimed: false,
            acquisition_invitation_sent_at: { not: null },
          },
        }),
        prisma.practitioners.count({
          where: { is_claimed: true },
        }),
        prisma.professions.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ]);

    const conversionRate =
      totalProspects + claimsCount > 0
        ? Math.round((claimsCount / (totalProspects + claimsCount)) * 100)
        : 0;

    const items = prospects.map((p) => {
      const hasPhoto = !!(p.photo_url && p.photo_url.trim());
      const hasBio = !!(p.bio && p.bio.trim().length > 0);
      const completion = (hasPhoto ? 1 : 0) + (hasBio ? 1 : 0);
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        locationCity: p.location_city,
        contactEmail: p.contact_email?.trim() || null,
        phone: p.phone?.trim() || null,
        website: p.website?.trim() || null,
        instagramUrl: p.instagram_url?.trim() || null,
        photoUrl: p.photo_url,
        profession: p.professions
          ? { id: p.professions.id, name: p.professions.name }
          : null,
        completionScore: completion,
        acquisitionInvitationSentAt: p.acquisition_invitation_sent_at?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      prospects: items,
      professions,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: filteredCount,
        totalPages: Math.ceil(filteredCount / PAGE_SIZE) || 1,
      },
      stats: {
        totalProspects,
        invitationsSent,
        claimsCount,
        conversionRate,
      },
    });
  } catch (error) {
    console.error("[Admin Acquisition] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch acquisition data" },
      { status: 500 }
    );
  }
}
