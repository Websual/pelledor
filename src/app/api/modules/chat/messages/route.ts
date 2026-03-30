import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { appointmentMessages, appointments } from "@/core/db/schema.modules";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const appointmentId = new URL(req.url).searchParams.get("appointmentId");
  if (!appointmentId)
    return NextResponse.json({ error: "appointmentId" }, { status: 400 });
  const db = getDb();
  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
  });
  if (!appt || appt.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db
    .select()
    .from(appointmentMessages)
    .where(eq(appointmentMessages.appointmentId, appointmentId));
  return NextResponse.json({ messages: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { appointmentId, content } = body;
  if (!appointmentId || !content)
    return NextResponse.json({ error: "Missing" }, { status: 400 });
  const db = getDb();
  const appt = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
  });
  if (!appt || appt.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [row] = await db
    .insert(appointmentMessages)
    .values({
      appointmentId,
      senderId: session.user.id,
      content: String(content).slice(0, 10000),
    })
    .returning();
  return NextResponse.json({ message: row });
}
