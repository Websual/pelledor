import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { generateEventSlug, ensureUniqueSlug } from "@/lib/slug";

const eventSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  event_type: z.enum(["CONFERENCE", "ATELIER", "STAGE"]).optional().default("CONFERENCE"),
  description: z.string().optional(),
  banner_url: z.string().optional().or(z.literal("")),
  poster_url: z.string().optional().or(z.literal("")),
  date: z.string().or(z.coerce.date()),
  price_cents: z.number().int().min(0),
  price_visio_cents: z.number().int().min(0).optional().nullable(),
  capacity: z.number().int().min(1),
  location_type: z.enum(["PRESENTIAL_ONLY", "VIDEO_ONLY", "HYBRID"]),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  level: z.string().optional(),
  material_required: z.string().optional(),
  accessibility: z.string().optional(),
  allow_on_site_payment: z.boolean().optional(),
  min_participants: z.number().int().min(1).optional(),
  auto_confirm_on_min: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true, subscription_status: true },
    });
    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    const events = await prisma.events.findMany({
      where: { practitioner_id: practitioner.id },
      include: {
        tickets: {
          where: { status: { in: ["confirmed", "payment_pending_offline", "reserved_hold"] } },
          include: {
            users: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    const eventsWithStats = events.map((e) => {
      const totalRevenue = e.tickets
        .filter((t) => t.status === "confirmed")
        .reduce((sum, t) => sum + (t.amount_cents ?? e.price_cents * t.quantity), 0);
      const totalTickets = e.tickets.reduce((sum, t) => sum + t.quantity, 0);
      return {
        ...e,
        totalRevenueCents: totalRevenue,
        totalTicketsSold: totalTickets,
        tickets: e.tickets.map((t) => ({
          id: t.id,
          status: t.status,
          quantity: t.quantity,
          amount_cents: t.amount_cents,
          users: t.users ? { name: t.users.name, email: t.users.email } : null,
        })),
        attendees: e.tickets.flatMap((t) =>
          Array(t.quantity)
            .fill(null)
            .map(() => ({
              name: t.users?.name,
              email: t.users?.email,
            }))
        ),
      };
    });

    return NextResponse.json({
      events: eventsWithStats,
      practitionerSubscriptionStatus: practitioner.subscription_status || "free",
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true, location_city: true, subscription_status: true },
    });
    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = eventSchema.parse({
      ...body,
      banner_url: body.banner_url ?? undefined,
      poster_url: body.poster_url ?? undefined,
    });

    const eventDate = new Date(validated.date);

    let lat = validated.lat ?? null;
    let lng = validated.lng ?? null;
    if ((lat == null || lng == null) && validated.address?.trim()) {
      try {
        const banRes = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(validated.address.trim())}&limit=1`
        );
        const banData = await banRes.json();
        const feat = banData.features?.[0];
        if (feat?.geometry?.coordinates) {
          const [lngVal, latVal] = feat.geometry.coordinates;
          lat = lat ?? latVal;
          lng = lng ?? lngVal;
        }
      } catch {
        // ignore geocode errors
      }
    }

    const baseSlug = generateEventSlug(
      validated.title,
      practitioner.location_city || "",
      eventDate
    );
    const existingSlugs = await prisma.events
      .findMany({ select: { slug: true } })
      .then((rows) => rows.map((r) => r.slug));
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);

    const isPremium = practitioner.subscription_status === "active";
    const allowOnSite =
      validated.allow_on_site_payment === true &&
      isPremium &&
      (validated.location_type === "PRESENTIAL_ONLY" || validated.location_type === "HYBRID");

    const event = await prisma.events.create({
      data: {
        id: createId(),
        slug,
        practitioner_id: practitioner.id,
        title: validated.title,
        event_type: validated.event_type as "CONFERENCE" | "ATELIER" | "STAGE",
        description: validated.description || null,
        banner_url: validated.banner_url || null,
        poster_url: validated.poster_url || null,
        date: eventDate,
        price_cents: validated.price_cents,
        price_visio_cents: validated.price_visio_cents ?? null,
        capacity: validated.capacity,
        remaining_places: validated.capacity,
        location_type: validated.location_type as "PRESENTIAL_ONLY" | "VIDEO_ONLY" | "HYBRID",
        address: validated.address || null,
        lat,
        lng,
        level: validated.level || null,
        material_required: validated.material_required || null,
        accessibility: validated.accessibility || null,
        allow_on_site_payment: allowOnSite,
        min_participants: validated.min_participants ?? 1,
        auto_confirm_on_min: validated.auto_confirm_on_min ?? false,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
