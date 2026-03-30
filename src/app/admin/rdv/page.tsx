import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { users } from "@/core/db/schema";
import {
  appointments,
  practitioners,
  services,
} from "@/core/db/schema.modules";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function AdminRdvPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const db = getDb();
  const prac = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  let rows: {
    id: string;
    startsAt: Date;
    status: string;
    clientEmail: string;
    serviceName: string;
  }[] = [];
  if (prac) {
    rows = await db
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
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Mes rendez-vous (praticien)</h1>
      {!prac && (
        <p className="mt-2 text-sm text-amber-800">
          Liez votre compte : Admin → Donnees demo → creer praticien avec « Lier a mon compte ».
        </p>
      )}
      <ul className="mt-6 space-y-2">
        {rows.map((a) => (
          <li key={a.id} className="rounded border p-3 text-sm">
            <span className="font-medium">{a.serviceName}</span> —{" "}
            {new Date(a.startsAt).toLocaleString()} — {a.clientEmail} — {a.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
