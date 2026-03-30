import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { events, tickets } from "@/core/db/schema.modules";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const rows = await db
    .select({
      ticket: tickets,
      eventTitle: events.title,
      eventDate: events.date,
      eventSlug: events.slug,
    })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(eq(tickets.userId, session.user.id))
    .orderBy(desc(tickets.createdAt));
  return NextResponse.json({ tickets: rows });
}
