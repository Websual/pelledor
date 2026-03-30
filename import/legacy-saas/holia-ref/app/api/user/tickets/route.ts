import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: Liste des billets (tickets) achetés par l'utilisateur connecté.
 * Retourne les événements avec infos pour affichage (date, lieu, affiche, slug, etc.).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await prisma.tickets.findMany({
      where: {
        user_id: session.user.id,
        status: { in: ["confirmed", "reserved_hold", "payment_pending_offline"] },
      },
      include: {
        events: {
          include: {
            practitioners: {
              select: {
                id: true,
                title: true,
                slug: true,
                address: true,
                location_city: true,
              },
            },
          },
        },
      },
      orderBy: { purchased_at: "desc" },
    });

    const items = tickets.map((t) => {
      const e = t.events;
      const p = e.practitioners;
      return {
        id: t.id,
        quantity: t.quantity,
        status: t.status,
        purchasedAt: t.purchased_at,
        event: {
          id: e.id,
          title: e.title,
          slug: e.slug,
          date: e.date,
          address: e.address,
          locationType: e.location_type,
          bannerUrl: e.banner_url,
          posterUrl: e.poster_url,
          practitionerName: p?.title ?? null,
          practitionerSlug: p?.slug ?? null,
          locationCity: p?.location_city ?? null,
          practitionerAddress: p?.address ?? null,
        },
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[user/tickets] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
