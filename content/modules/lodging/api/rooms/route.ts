import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners, rooms } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

async function myPractitionerId(userId: string) {
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, userId),
  });
  return p?.id ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = await myPractitionerId(session.user.id);
  if (!pid)
    return NextResponse.json({ error: "Aucun profil établissement" }, { status: 400 });
  const db = getDb();
  const list = await db.select().from(rooms).where(eq(rooms.practitionerId, pid));
  return NextResponse.json({ rooms: list });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = await myPractitionerId(session.user.id);
  if (!pid)
    return NextResponse.json({ error: "Aucun profil établissement" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const title = String(body.title ?? "").trim();
  if (!slug || !title)
    return NextResponse.json({ error: "slug et title requis" }, { status: 400 });
  const db = getDb();
  const [row] = await db
    .insert(rooms)
    .values({
      practitionerId: pid,
      slug: slug.slice(0, 160),
      title: title.slice(0, 512),
      description: String(body.description ?? "").slice(0, 8000),
      capacity: Math.max(1, parseInt(body.capacity, 10) || 2),
      priceCentsNight: Math.max(0, parseInt(body.priceCentsNight, 10) || 0),
      imageUrl: body.imageUrl ? String(body.imageUrl).slice(0, 2048) : null,
      published: Boolean(body.published),
    })
    .returning();
  return NextResponse.json({ room: row });
}
