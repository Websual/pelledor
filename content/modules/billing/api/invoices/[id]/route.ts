import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { invoices, practitioners } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "").toLowerCase();
  if (!["draft", "sent", "paid", "canceled"].includes(status))
    return NextResponse.json({ error: "status" }, { status: 400 });
  const db = getDb();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prac = await db.query.practitioners.findFirst({
    where: eq(practitioners.id, inv.practitionerId),
  });
  if (prac?.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  await db.update(invoices).set({ status }).where(eq(invoices.id, id));
  return NextResponse.json({ ok: true });
}
