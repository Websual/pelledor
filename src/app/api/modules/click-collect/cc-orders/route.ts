import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { ccOrders, practitioners } from "@/core/db/schema.modules";
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
  if (!p) return NextResponse.json({ orders: [] });
  const orders = await db
    .select()
    .from(ccOrders)
    .where(eq(ccOrders.restaurantId, p.id));
  orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const establishment = String(body.establishment ?? "").trim();
  const clientName = String(body.clientName ?? "").trim();
  const clientEmail = String(body.clientEmail ?? "").trim();
  const items = Array.isArray(body.items) ? body.items : [];
  const pickupSlot = body.pickupSlot ? new Date(body.pickupSlot) : null;

  if (!establishment || !clientName || !clientEmail.includes("@") || !items.length || !pickupSlot)
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });

  const totalCents = items.reduce(
    (sum: number, item: { price?: number; priceCents?: number; qty?: number; quantity?: number }) =>
      sum + (item.priceCents ?? item.price ?? 0) * (item.qty ?? item.quantity ?? 1),
    0
  );

  const db = getDb();
  const p = await db.query.practitioners.findFirst({ where: eq(practitioners.slug, establishment) });
  if (!p) return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });

  const [order] = await db
    .insert(ccOrders)
    .values({
      restaurantId: p.id,
      clientName: clientName.slice(0, 255),
      clientEmail: clientEmail.slice(0, 255),
      clientPhone: body.clientPhone ? String(body.clientPhone).slice(0, 64) : null,
      items,
      totalCents,
      pickupSlot,
      status: "pending",
    })
    .returning();

  return NextResponse.json({ ok: true, orderId: order.id, totalCents });
}
