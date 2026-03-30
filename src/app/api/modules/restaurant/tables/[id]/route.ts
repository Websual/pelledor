import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners, restaurantTables } from "@/core/db/schema.modules";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

async function owns(userId: string, tableId: string) {
  const db = getDb();
  const t = await db.query.restaurantTables.findFirst({
    where: eq(restaurantTables.id, tableId),
  });
  if (!t) return null;
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.id, t.practitionerId),
  });
  return p?.userId === userId ? t : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await owns(session.user.id, id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const [row] = await db
    .update(restaurantTables)
    .set({
      ...(body.name != null ? { name: String(body.name).slice(0, 128) } : {}),
      ...(body.seats != null
        ? { seats: Math.max(1, parseInt(body.seats, 10) || 2) }
        : {}),
      ...(body.active != null ? { active: Boolean(body.active) } : {}),
      ...(body.sortOrder != null
        ? { sortOrder: parseInt(body.sortOrder, 10) || 0 }
        : {}),
    })
    .where(eq(restaurantTables.id, id))
    .returning();
  return NextResponse.json({ table: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await owns(session.user.id, id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  await db.delete(restaurantTables).where(eq(restaurantTables.id, id));
  return NextResponse.json({ ok: true });
}
