import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners, restaurantTables } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

async function pid(userId: string) {
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
  const id = await pid(session.user.id);
  if (!id) return NextResponse.json({ tables: [] });
  const db = getDb();
  const rows = await db
    .select()
    .from(restaurantTables)
    .where(eq(restaurantTables.practitionerId, id));
  return NextResponse.json({ tables: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = await pid(session.user.id);
  if (!id)
    return NextResponse.json({ error: "Profil établissement requis" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name requis" }, { status: 400 });
  const db = getDb();
  const [row] = await db
    .insert(restaurantTables)
    .values({
      practitionerId: id,
      name: name.slice(0, 128),
      seats: Math.max(1, parseInt(body.seats, 10) || 2),
      sortOrder: parseInt(body.sortOrder, 10) || 0,
      active: body.active !== false,
    })
    .returning();
  return NextResponse.json({ table: row });
}
