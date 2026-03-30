import { getDb } from "@/core/db/server";
import { practitioners, rooms } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const establishment = searchParams.get("establishment")?.trim();
  if (!establishment)
    return NextResponse.json({ error: "establishment slug requis" }, { status: 400 });
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) return NextResponse.json({ rooms: [] });
  const rows = await db
    .select()
    .from(rooms)
    .where(eq(rooms.practitionerId, p.id));
  const pub = rows.filter((r) => r.published);
  return NextResponse.json({
    establishment: { slug: p.slug, title: p.title, city: p.city },
    rooms: pub.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      capacity: r.capacity,
      priceCentsNight: r.priceCentsNight,
      imageUrl: r.imageUrl,
    })),
  });
}
