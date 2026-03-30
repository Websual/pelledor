import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { users } from "@/core/db/schema";
import { appointments, practitioners, services } from "@/core/db/schema.modules";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** RDV recus par le praticien (user lie a la fiche). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const prac = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!prac)
    return NextResponse.json({ appointments: [], hint: "Liez votre compte a une fiche praticien" });
  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      clientEmail: users.email,
      serviceName: services.name,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.userId, users.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.practitionerId, prac.id))
    .orderBy(desc(appointments.startsAt));
  return NextResponse.json({ appointments: rows });
}
