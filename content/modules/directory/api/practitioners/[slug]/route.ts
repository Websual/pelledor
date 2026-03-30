import { getDb } from "@/core/db/server";
import { practitioners } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const db = getDb();
  const row = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, slug),
  });
  if (!row || !row.isActive)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    practitioner: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      bio: row.bio,
      city: row.city,
    },
  });
}
