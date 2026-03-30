import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { services } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const practitionerId = new URL(req.url).searchParams.get("practitionerId");
  if (!practitionerId)
    return NextResponse.json({ error: "practitionerId" }, { status: 400 });
  const db = getDb();
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.practitionerId, practitionerId));
  return NextResponse.json({ services: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { practitionerId, name, durationMin, priceCents, description } = body;
  if (!practitionerId || !name) {
    return NextResponse.json({ error: "practitionerId, name" }, { status: 400 });
  }
  const db = getDb();
  const [row] = await db
    .insert(services)
    .values({
      practitionerId,
      name: String(name).slice(0, 255),
      durationMin: Number(durationMin) || 60,
      priceCents: Number(priceCents) || 0,
      description: description ? String(description).slice(0, 4000) : null,
    })
    .returning();
  return NextResponse.json({ service: row });
}
