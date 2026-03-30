import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { ccOrders, ccProducts, practitioners } from "@/core/db/schema.modules";
import { rateLimitMemory } from "@/core/security/rate-limit-memory";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

const CC_ORDER_MAX_LINES = 50;
const CC_MAX_QTY_PER_SKU = 99;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

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
  const ip = clientIp(req);
  if (!rateLimitMemory(`cc-order:ip:${ip}`, 40, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de commandes. Réessayez plus tard." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const establishment = String(body.establishment ?? "").trim();
  const clientName = String(body.clientName ?? "").trim();
  const clientEmail = String(body.clientEmail ?? "").trim();
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const pickupSlot = body.pickupSlot ? new Date(body.pickupSlot) : null;

  if (
    !establishment ||
    !clientName ||
    !clientEmail.includes("@") ||
    !rawItems.length ||
    !pickupSlot ||
    Number.isNaN(pickupSlot.getTime())
  ) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const qtyByProduct = new Map<string, number>();
  for (const row of rawItems) {
    const productId = String((row as { productId?: string }).productId ?? "").trim();
    if (!UUID_RE.test(productId)) {
      return NextResponse.json({ error: "Panier invalide" }, { status: 400 });
    }
    const add = Math.min(
      CC_MAX_QTY_PER_SKU,
      Math.max(1, Math.floor(Number((row as { qty?: number }).qty ?? (row as { quantity?: number }).quantity ?? 1))),
    );
    const merged = (qtyByProduct.get(productId) ?? 0) + add;
    qtyByProduct.set(productId, Math.min(CC_MAX_QTY_PER_SKU, merged));
  }

  if (qtyByProduct.size === 0 || qtyByProduct.size > CC_ORDER_MAX_LINES) {
    return NextResponse.json({ error: "Panier invalide" }, { status: 400 });
  }

  const db = getDb();
  const p = await db.query.practitioners.findFirst({ where: eq(practitioners.slug, establishment) });
  if (!p) return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });

  const productIds = [...qtyByProduct.keys()];
  const catalogRows = await db
    .select()
    .from(ccProducts)
    .where(
      and(
        eq(ccProducts.restaurantId, p.id),
        eq(ccProducts.available, true),
        inArray(ccProducts.id, productIds),
      ),
    );

  if (catalogRows.length !== productIds.length) {
    return NextResponse.json({ error: "Produit indisponible ou inconnu" }, { status: 400 });
  }

  const orderItems: { productId: string; name: string; qty: number; priceCents: number }[] = [];
  let totalCents = 0;
  for (const row of catalogRows) {
    const qty = qtyByProduct.get(row.id)!;
    orderItems.push({
      productId: row.id,
      name: row.name,
      qty,
      priceCents: row.priceCents,
    });
    totalCents += row.priceCents * qty;
  }

  const [order] = await db
    .insert(ccOrders)
    .values({
      restaurantId: p.id,
      clientName: clientName.slice(0, 255),
      clientEmail: clientEmail.slice(0, 255),
      clientPhone: body.clientPhone ? String(body.clientPhone).slice(0, 64) : null,
      items: orderItems,
      totalCents,
      pickupSlot,
      status: "pending",
    })
    .returning();

  return NextResponse.json({ ok: true, orderId: order.id, totalCents });
}
