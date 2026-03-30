import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EVENT_TYPES = ["CONFERENCE", "ATELIER", "STAGE"] as const;
const GEO_RADIUS_KM = 30;

async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(city)}&type=municipality&limit=1`
    );
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature?.geometry?.coordinates) return null;
    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bounds = searchParams.get("bounds");
    const city = searchParams.get("city")?.trim();
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const radius = searchParams.get("radius");
    const eventType = searchParams.get("type");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const now = new Date();

    let where: any = {
      status: "active",
      date: { gte: now },
      remaining_places: { gt: 0 },
      practitioners: { is_active: true },
      OR: [
        { lat: { not: null }, lng: { not: null } },
        { practitioners: { lat: { not: null }, lng: { not: null } } },
      ],
    };

    if (eventType && EVENT_TYPES.includes(eventType as any)) {
      where.event_type = eventType;
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        where.date = { ...where.date, gte: from };
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (!isNaN(to.getTime())) {
        where.date = { ...where.date, lte: to };
      }
    }

    if (bounds) {
      const [north, south, east, west] = bounds.split(",").map(parseFloat);
      if ([north, south, east, west].every((n) => !isNaN(n))) {
        where.practitioners = {
          ...where.practitioners,
          lat: { gte: south, lte: north },
          lng: { gte: west, lte: east },
        };
      }
    } else if (city && city.length >= 2) {
      let centerLat: number;
      let centerLng: number;
      if (latitude && longitude) {
        centerLat = parseFloat(latitude);
        centerLng = parseFloat(longitude);
      } else {
        const coords = await geocodeCity(city);
        if (!coords) {
          return NextResponse.json({
            success: true,
            data: { type: "FeatureCollection", features: [] },
          });
        }
        centerLat = coords.lat;
        centerLng = coords.lng;
      }
      const radKm = radius ? parseFloat(radius) : GEO_RADIUS_KM;
      const deltaLat = radKm / 111;
      const deltaLng = radKm / (111 * Math.cos((centerLat * Math.PI) / 180));
      where.practitioners = {
        ...where.practitioners,
        lat: { gte: centerLat - deltaLat, lte: centerLat + deltaLat },
        lng: { gte: centerLng - deltaLng, lte: centerLng + deltaLng },
      };
    }

    const events = await prisma.events.findMany({
      where,
      include: {
        practitioners: {
          select: {
            id: true,
            slug: true,
            title: true,
            photo_url: true,
            location_city: true,
            lat: true,
            lng: true,
          },
        },
      },
      orderBy: { date: "asc" },
      take: 200,
    });

    const features = events
      .filter((e) => {
        const hasEventCoords = e.lat != null && e.lng != null;
        const hasPractitionerCoords = e.practitioners?.lat != null && e.practitioners?.lng != null;
        return hasEventCoords || hasPractitionerCoords;
      })
      .map((e) => {
        const lng = e.lng ?? e.practitioners!.lng!;
        const lat = e.lat ?? e.practitioners!.lat!;
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat],
          },
          properties: {
            id: e.id,
            eventId: e.id,
            eventSlug: e.slug,
            title: e.title,
            event_type: e.event_type,
            date: e.date.toISOString(),
            price_cents: e.price_cents,
            remaining_places: e.remaining_places,
            banner_url: e.banner_url,
            poster_url: e.poster_url,
            practitionerId: e.practitioners!.id,
            practitionerSlug: e.practitioners!.slug,
            practitionerTitle: e.practitioners!.title,
            location_city: e.practitioners!.location_city || "",
            profileUrl: `/evenements/${e.slug}`,
          },
        };
      });

    const geoJsonData = {
      type: "FeatureCollection",
      features,
    };

    console.log("[map-points] Events found:", events.length, "features:", features.length, "bounds:", bounds ?? "none", "city:", city ?? "none");

    return NextResponse.json({
      success: true,
      data: geoJsonData,
    });
  } catch (error) {
    console.error("Error fetching event map points:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
