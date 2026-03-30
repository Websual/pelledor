import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { anamneseForms, practitioners } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!p) return NextResponse.json({ forms: [] });
  const forms = await db
    .select()
    .from(anamneseForms)
    .where(eq(anamneseForms.practitionerId, p.id));
  return NextResponse.json({ forms });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const fields = Array.isArray(body.fields) ? body.fields : [];
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!p) return NextResponse.json({ error: "Praticien introuvable" }, { status: 404 });
  const [form] = await db
    .insert(anamneseForms)
    .values({ practitionerId: p.id, title, fields })
    .returning();
  return NextResponse.json({ ok: true, form });
}
