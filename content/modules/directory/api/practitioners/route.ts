import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select({
      id: practitioners.id,
      slug: practitioners.slug,
      title: practitioners.title,
      city: practitioners.city,
    })
    .from(practitioners)
    .where(eq(practitioners.isActive, true));
  return NextResponse.json({ practitioners: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 160);
  const title = String(body.title || "Praticien").slice(0, 512);
  const city = String(body.city || "").slice(0, 128);
  const bio = String(body.bio || "").slice(0, 8000);
  if (!slug) return NextResponse.json({ error: "slug" }, { status: 400 });
  const db = getDb();
  const [row] = await db
    .insert(practitioners)
    .values({
      userId: body.linkToMe ? session.user.id : null,
      slug,
      title,
      city,
      bio,
      isActive: true,
    })
    .returning();
  return NextResponse.json({ practitioner: row });
}
