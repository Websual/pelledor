import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import {
  invoices,
  practitioners,
  quoteRequests,
} from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

async function owns(userId: string, quoteId: string) {
  const db = getDb();
  const q = await db.query.quoteRequests.findFirst({
    where: eq(quoteRequests.id, quoteId),
  });
  if (!q) return null;
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.id, q.practitionerId),
  });
  return p?.userId === userId ? q : null;
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
  const updates: Record<string, unknown> = {};
  if (body.status != null) {
    const s = String(body.status).toLowerCase();
    if (["new", "contacted", "quoted", "won", "lost"].includes(s))
      updates.status = s;
  }
  if (body.createDraftInvoice && body.amountCents != null) {
    const q = await owns(session.user.id, id);
    if (!q) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const cents = Math.max(0, parseInt(body.amountCents, 10) || 0);
    const num = `DEV-${Date.now()}`;
    const [inv] = await db
      .insert(invoices)
      .values({
        practitionerId: q.practitionerId,
        invoiceNumber: num,
        amountCents: cents,
        totalCents: cents,
        status: "draft",
      })
      .returning();
    updates.convertedInvoiceId = inv.id;
    updates.status = "quoted";
  }
  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  const [row] = await db
    .update(quoteRequests)
    .set(updates as never)
    .where(eq(quoteRequests.id, id))
    .returning();
  return NextResponse.json({ quote: row });
}
