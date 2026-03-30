import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { events, tickets } from "@/core/db/schema.modules";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MesBilletsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const db = getDb();
  const rows = await db
    .select({
      quantity: tickets.quantity,
      amountCents: tickets.amountCents,
      createdAt: tickets.createdAt,
      eventTitle: events.title,
      eventDate: events.date,
      eventSlug: events.slug,
    })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(eq(tickets.userId, session.user.id))
    .orderBy(desc(tickets.createdAt));

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link href="/evenements" className="text-sm underline">
        Evenements
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Mes billets</h1>
      <ul className="mt-6 space-y-4">
        {rows.map((r, i) => (
          <li key={i} className="rounded border p-4 text-sm">
            <div className="font-medium">{r.eventTitle}</div>
            <div className="text-neutral-600">
              {new Date(r.eventDate).toLocaleString()}
            </div>
            <div>
              {r.quantity} place(s) —{" "}
              {r.amountCents != null
                ? `${(r.amountCents / 100).toFixed(2)} EUR`
                : "—"}
            </div>
            <Link
              href={`/evenements/${r.eventSlug}`}
              className="mt-2 inline-block text-xs underline"
            >
              Voir l evenement
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">Aucun billet pour l instant.</p>
      )}
    </main>
  );
}
