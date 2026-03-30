import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { appointments, practitioners } from "@/core/db/schema.modules";
import { Hooks } from "@/core/events/hooks";
import { and, eq } from "drizzle-orm";
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
  const status = String(body.status || "").toUpperCase();
  const allowed = ["PENDING", "CONFIRMED", "CANCELED", "DONE"];
  if (!allowed.includes(status))
    return NextResponse.json({ error: "status invalide" }, { status: 400 });
  const db = getDb();
  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.id, id),
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isClient = appt.userId === session.user.id;
  const prac = await db.query.practitioners.findFirst({
    where: eq(practitioners.id, appt.practitionerId),
  });
  const isPractitioner =
    prac?.userId === session.user.id || session.user.role === "admin";

  if (status === "CANCELED" && isClient) {
    await db.update(appointments).set({ status: "CANCELED" }).where(eq(appointments.id, id));
  } else if (isPractitioner && ["CONFIRMED", "CANCELED", "DONE"].includes(status)) {
    await db.update(appointments).set({ status }).where(eq(appointments.id, id));
  } else {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  await Hooks.doAction("appointment_status_changed", {
    appointmentId: id,
    status,
    actorUserId: session.user.id,
  });
  return NextResponse.json({ ok: true });
}
