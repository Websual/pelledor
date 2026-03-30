import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import {
  notifications,
  practitioners,
  quoteRequests,
} from "@/core/db/schema.modules";
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
  if (!p) return NextResponse.json({ quotes: [] });
  const rows = await db
    .select()
    .from(quoteRequests)
    .where(eq(quoteRequests.practitionerId, p.id));
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return NextResponse.json({ quotes: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const establishment = String(body.establishment ?? "").trim();
  const clientName = String(body.clientName ?? "").trim();
  const clientEmail = String(body.clientEmail ?? "").trim();
  const clientPhone = String(body.clientPhone ?? "").trim() || null;
  const address = body.address ? String(body.address).slice(0, 2000) : null;
  const description = String(body.description ?? "").trim().slice(0, 8000);
  if (!establishment || !clientName || !clientEmail.includes("@"))
    return NextResponse.json({ error: "Champs requis" }, { status: 400 });
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) return NextResponse.json({ error: "Artisan introuvable" }, { status: 404 });
  const [row] = await db
    .insert(quoteRequests)
    .values({
      practitionerId: p.id,
      clientName: clientName.slice(0, 255),
      clientEmail: clientEmail.slice(0, 255),
      clientPhone: clientPhone ? clientPhone.slice(0, 64) : null,
      address,
      description,
      status: "new",
    })
    .returning();
  if (p.userId) {
    await db.insert(notifications).values({
      userId: p.userId,
      type: "QUOTE_REQUEST",
      title: "Nouvelle demande de devis",
      message: `${clientName} — ${description.slice(0, 120)}…`,
      link: "/admin/devis",
    });
  }
  return NextResponse.json({ ok: true, id: row.id });
}
