import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { workingHours } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const practitionerId = new URL(req.url).searchParams.get("practitionerId");
  if (!practitionerId)
    return NextResponse.json({ error: "practitionerId" }, { status: 400 });
  const db = getDb();
  const rows = await db
    .select()
    .from(workingHours)
    .where(eq(workingHours.practitionerId, practitionerId));
  return NextResponse.json({ workingHours: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { practitionerId, dayOfWeek, startTime, endTime } = body;
  if (practitionerId == null || dayOfWeek == null || !startTime || !endTime) {
    return NextResponse.json({ error: "Champs requis" }, { status: 400 });
  }
  const db = getDb();
  const [row] = await db
    .insert(workingHours)
    .values({
      practitionerId,
      dayOfWeek: Number(dayOfWeek),
      startTime: String(startTime).slice(0, 8),
      endTime: String(endTime).slice(0, 8),
      isActive: true,
    })
    .returning();
  return NextResponse.json({ slot: row });
}
