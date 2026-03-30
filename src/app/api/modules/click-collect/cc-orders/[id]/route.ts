import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { ccOrders } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const validStatuses = ["pending", "paid", "ready", "done", "cancelled"];
  const status = String(body.status ?? "").trim();
  if (!validStatuses.includes(status))
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  const db = getDb();
  await db.update(ccOrders).set({ status }).where(eq(ccOrders.id, id));
  return NextResponse.json({ ok: true });
}
