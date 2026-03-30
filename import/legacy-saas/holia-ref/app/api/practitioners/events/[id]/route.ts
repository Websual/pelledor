import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateEventSlug, ensureUniqueSlug } from "@/lib/slug";

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  event_type: z.enum(["CONFERENCE", "ATELIER", "STAGE"]).optional(),
  description: z.string().optional().nullable(),
  banner_url: z.string().optional().nullable(),
  poster_url: z.string().optional().nullable(),
  date: z.string().or(z.coerce.date()).optional(),
  price_cents: z.number().int().min(0).optional(),
  price_visio_cents: z.number().int().min(0).optional().nullable(),
  capacity: z.number().int().min(1).optional(),
  location_type: z.enum(["PRESENTIAL_ONLY", "VIDEO_ONLY", "HYBRID"]).optional(),
  address: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  level: z.string().optional().nullable(),
  material_required: z.string().optional().nullable(),
  accessibility: z.string().optional().nullable(),
  allow_on_site_payment: z.boolean().optional(),
  min_participants: z.number().int().min(1).optional(),
  auto_confirm_on_min: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      select: { id: true, subscription_status: true, location_city: true, address: true },
    });
    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    const { id } = await params;
    const event = await prisma.events.findFirst({
      where: { id, practitioner_id: practitioner.id },
      include: {
        practitioners: {
          select: { location_city: true, address: true },
        },
      },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateEventSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    Object.entries(validated).forEach(([k, v]) => {
      if (v !== undefined) updateData[k] = v;
    });
    if (validated.date) updateData.date = new Date(validated.date);

    if ((validated.lat == null || validated.lng == null) && (validated.address ?? event.address)?.trim()) {
      const addrToGeocode = (validated.address ?? event.address ?? "").trim();
      try {
        const banRes = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addrToGeocode)}&limit=1`
        );
        const banData = await banRes.json();
        const feat = banData.features?.[0];
        if (feat?.geometry?.coordinates) {
          const [lngVal, latVal] = feat.geometry.coordinates;
          updateData.lat = validated.lat ?? latVal;
          updateData.lng = validated.lng ?? lngVal;
        }
      } catch {
        // ignore
      }
    }

    // Régénérer le slug si titre, adresse/ville ou date change
    const titleChanged = validated.title !== undefined;
    const dateChanged = validated.date !== undefined;
    const addressChanged = validated.address !== undefined;
    if (titleChanged || dateChanged || addressChanged) {
      const practitionerData = event.practitioners as { location_city?: string; address?: string } | null;
      const addr = validated.address ?? event.address ?? practitionerData?.address ?? "";
      const cityFromAddr = addr.split(",").pop()?.trim() || "";
      const city = cityFromAddr || practitionerData?.location_city || "lieu";
      const newDate = validated.date ? new Date(validated.date) : event.date;
      const baseSlug = generateEventSlug(
        validated.title ?? event.title,
        city,
        newDate
      );
      const existingSlugs = await prisma.events
        .findMany({ where: { id: { not: event.id } }, select: { slug: true } })
        .then((rows) => rows.map((r) => r.slug));
      updateData.slug = ensureUniqueSlug(baseSlug, existingSlugs);
    }

    if (validated.capacity !== undefined) {
      const diff = validated.capacity - event.capacity;
      updateData.remaining_places = Math.min(
        validated.capacity,
        Math.max(0, event.remaining_places + diff)
      );
    }

    if (validated.allow_on_site_payment !== undefined) {
      const isPremium = practitioner.subscription_status === "active";
      const locType = (validated.location_type ?? event.location_type) as string;
      updateData.allow_on_site_payment =
        validated.allow_on_site_payment &&
        isPremium &&
        (locType === "PRESENTIAL_ONLY" || locType === "HYBRID");
    }

    if (validated.min_participants !== undefined) updateData.min_participants = validated.min_participants;
    if (validated.auto_confirm_on_min !== undefined) updateData.auto_confirm_on_min = validated.auto_confirm_on_min;

    const updated = await prisma.events.update({
      where: { id },
      data: updateData as any,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });
    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    const { id } = await params;
    const event = await prisma.events.findFirst({
      where: { id, practitioner_id: practitioner.id },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.events.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
