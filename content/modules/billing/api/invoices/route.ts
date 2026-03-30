import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { invoices, practitioners } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const prac = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!prac)
    return NextResponse.json({ invoices: [], hint: "Pas de fiche praticien" });
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.practitionerId, prac.id));
  return NextResponse.json({ invoices: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { practitionerId, userId, appointmentId, amountCents } = body;
  if (!practitionerId || amountCents == null) {
    return NextResponse.json({ error: "practitionerId, amountCents" }, { status: 400 });
  }
  const cents = Number(amountCents);
  const num = `INV-${Date.now()}`;
  const db = getDb();
  const [row] = await db
    .insert(invoices)
    .values({
      practitionerId,
      userId: userId || null,
      appointmentId: appointmentId || null,
      invoiceNumber: num,
      amountCents: cents,
      totalCents: cents,
      status: "draft",
    })
    .returning();
  return NextResponse.json({ invoice: row });
}
