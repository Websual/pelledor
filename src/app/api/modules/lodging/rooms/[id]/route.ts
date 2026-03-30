import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners, rooms } from "@/core/db/schema.modules";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

async function canEdit(userId: string, roomId: string) {
  const db = getDb();
  const r = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
  if (!r) return null;
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.id, r.practitionerId),
  });
  if (p?.userId !== userId) return null;
  return r;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await canEdit(session.user.id, id);
  if (!r) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const [row] = await db
    .update(rooms)
    .set({
      ...(body.title != null ? { title: String(body.title).slice(0, 512) } : {}),
      ...(body.description != null
        ? { description: String(body.description).slice(0, 8000) }
        : {}),
      ...(body.capacity != null
        ? { capacity: Math.max(1, parseInt(body.capacity, 10) || 2) }
        : {}),
      ...(body.priceCentsNight != null
        ? { priceCentsNight: Math.max(0, parseInt(body.priceCentsNight, 10) || 0) }
        : {}),
      ...(body.imageUrl !== undefined
        ? {
            imageUrl: body.imageUrl
              ? String(body.imageUrl).slice(0, 2048)
              : null,
          }
        : {}),
      ...(body.published != null ? { published: Boolean(body.published) } : {}),
      ...(body.slug != null
        ? {
            slug: String(body.slug)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "-")
              .slice(0, 160),
          }
        : {}),
    })
    .where(eq(rooms.id, id))
    .returning();
  return NextResponse.json({ room: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await canEdit(session.user.id, id);
  if (!r) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  await db.delete(rooms).where(eq(rooms.id, id));
  return NextResponse.json({ ok: true });
}
