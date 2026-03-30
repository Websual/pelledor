import { getDb } from "@/core/db/server";
import { roomBookings, rooms } from "@/core/db/schema.modules";
import { and, eq, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

function parseYmd(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T12:00:00Z").getTime();
  const b = new Date(checkOut + "T12:00:00Z").getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId")?.trim();
  const checkIn = parseYmd(searchParams.get("checkIn") ?? "");
  const checkOut = parseYmd(searchParams.get("checkOut") ?? "");
  if (!roomId || !checkIn || !checkOut)
    return NextResponse.json(
      { error: "roomId, checkIn, checkOut (YYYY-MM-DD) requis" },
      { status: 400 }
    );
  if (checkOut <= checkIn)
    return NextResponse.json({ error: "checkOut doit être après checkIn" }, { status: 400 });
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1)
    return NextResponse.json({ error: "Minimum 1 nuit" }, { status: 400 });

  const db = getDb();
  const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
  if (!room || !room.published)
    return NextResponse.json({ available: false, reason: "Chambre introuvable" });

  const conflicts = await db
    .select({ id: roomBookings.id })
    .from(roomBookings)
    .where(
      and(
        eq(roomBookings.roomId, roomId),
        or(
          eq(roomBookings.status, "confirmed"),
          eq(roomBookings.status, "pending")
        ),
        sql`(${roomBookings.checkIn}::date < ${checkOut}::date AND ${roomBookings.checkOut}::date > ${checkIn}::date)`
      )
    )
    .limit(1);

  const available = conflicts.length === 0;
  return NextResponse.json({
    available,
    nights,
    totalCents: available ? nights * room.priceCentsNight : null,
    priceCentsNight: room.priceCentsNight,
  });
}
