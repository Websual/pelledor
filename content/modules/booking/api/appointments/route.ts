import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import {
  appointments,
  notifications,
  practitioners,
} from "@/core/db/schema.modules";
import { Hooks } from "@/core/events/hooks";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const rows = await db
    .select()
    .from(appointments)
    .where(eq(appointments.userId, session.user.id))
    .orderBy(desc(appointments.startsAt));
  return NextResponse.json({ appointments: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { practitionerId, serviceId, startsAt } = body;
  if (!practitionerId || !serviceId || !startsAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const db = getDb();
  const [row] = await db
    .insert(appointments)
    .values({
      userId: session.user.id,
      practitionerId,
      serviceId,
      startsAt: new Date(startsAt),
      status: "PENDING",
      paymentStatus: "PENDING",
    })
    .returning();
  const prac = await db.query.practitioners.findFirst({
    where: eq(practitioners.id, practitionerId),
  });
  if (prac?.userId) {
    await db.insert(notifications).values({
      userId: prac.userId,
      type: "BOOKING_NEW",
      title: "Nouveau rendez-vous",
      message: `RDV propose le ${new Date(startsAt).toLocaleString()}`,
      link: "/admin",
    });
  }
  await Hooks.doAction("appointment_created", {
    appointmentId: row.id,
    userId: session.user.id,
    practitionerId,
  });
  return NextResponse.json({ appointment: row });
}
