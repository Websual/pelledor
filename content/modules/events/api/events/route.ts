import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { events } from "@/core/db/schema.modules";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.status, "active"))
    .orderBy(desc(events.date));
  return NextResponse.json({ events: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const {
    practitionerId,
    slug,
    title,
    description,
    date,
    priceCents,
    capacity,
  } = body;
  if (!practitionerId || !slug || !title || !date) {
    return NextResponse.json({ error: "Champs requis" }, { status: 400 });
  }
  const cap = Number(capacity) || 20;
  const db = getDb();
  const [row] = await db
    .insert(events)
    .values({
      practitionerId,
      slug: String(slug)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .slice(0, 160),
      title: String(title).slice(0, 512),
      description: description ? String(description) : null,
      date: new Date(date),
      priceCents: Number(priceCents) || 0,
      capacity: cap,
      remainingPlaces: cap,
      status: "active",
    })
    .returning();
  return NextResponse.json({ event: row });
}
