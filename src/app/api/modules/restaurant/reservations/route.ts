import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import {
  notifications,
  practitioners,
  restaurantReservations,
  restaurantTables,
} from "@/core/db/schema.modules";
import { rateLimitByIp } from "@/core/security/rate-limit-request";
import { and, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";

const SLOT_MIN = 90;

function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!p) return NextResponse.json({ reservations: [] });
  const rows = await db
    .select()
    .from(restaurantReservations)
    .where(eq(restaurantReservations.practitionerId, p.id));
  rows.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  return NextResponse.json({ reservations: rows });
}

export async function POST(req: Request) {
  if (!(await rateLimitByIp("restaurant-reservation", 30, 15 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Trop de réservations. Réessayez plus tard." },
      { status: 429 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const establishment = String(body.establishment ?? "").trim();
  const date = String(body.date ?? "").trim();
  const time = String(body.time ?? "").trim();
  const partySize = Math.max(1, parseInt(body.partySize, 10) || 2);
  const clientName = String(body.clientName ?? "").trim();
  const clientEmail = String(body.clientEmail ?? "").trim();
  const clientPhone = String(body.clientPhone ?? "").trim() || null;
  const notes = body.notes ? String(body.notes).slice(0, 2000) : null;
  if (!establishment || !date || !time || !clientName || !clientEmail.includes("@"))
    return NextResponse.json({ error: "Champs invalides" }, { status: 400 });

  const startsAt = new Date(`${date}T${time}:00`);
  if (isNaN(startsAt.getTime()))
    return NextResponse.json({ error: "Date/heure invalides" }, { status: 400 });
  const endsAt = new Date(startsAt.getTime() + SLOT_MIN * 60 * 1000);

  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });

  const tables = await db
    .select()
    .from(restaurantTables)
    .where(
      and(
        eq(restaurantTables.practitionerId, p.id),
        eq(restaurantTables.active, true)
      )
    );
  const candidates = tables.filter((t) => t.seats >= partySize);
  if (!candidates.length)
    return NextResponse.json(
      { error: "Aucune table pour ce nombre de couverts" },
      { status: 409 }
    );

  const tableIds = candidates.map((t) => t.id);
  const existing = await db
    .select()
    .from(restaurantReservations)
    .where(
      and(
        inArray(restaurantReservations.tableId, tableIds),
        or(
          eq(restaurantReservations.status, "confirmed"),
          eq(restaurantReservations.status, "pending")
        )
      )
    );

  for (const table of candidates.sort((a, b) => a.seats - b.seats)) {
    const busy = existing.filter(
      (r) =>
        r.tableId === table.id &&
        overlaps(startsAt, endsAt, r.startsAt, r.endsAt)
    );
    if (busy.length) continue;

    const [row] = await db
      .insert(restaurantReservations)
      .values({
        practitionerId: p.id,
        tableId: table.id,
        startsAt,
        endsAt,
        partySize,
        clientName: clientName.slice(0, 255),
        clientEmail: clientEmail.slice(0, 255),
        clientPhone: clientPhone ? clientPhone.slice(0, 64) : null,
        status: "confirmed",
        notes,
      })
      .returning();

    if (p.userId) {
      await db.insert(notifications).values({
        userId: p.userId,
        type: "RESTAURANT_BOOKING",
        title: "Nouvelle réservation",
        message: `${clientName} — ${partySize} pers. — ${startsAt.toLocaleString("fr-FR")} (${table.name})`,
        link: "/admin/restaurant",
      });
    }
    return NextResponse.json({
      ok: true,
      reservation: row,
      tableName: table.name,
    });
  }

  return NextResponse.json(
    { error: "Plus de table libre à ce créneau" },
    { status: 409 }
  );
}
