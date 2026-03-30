import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners, restaurantReservations, restaurantTables } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { RestaurantAdminClient } from "./client";

export default async function AdminRestaurantPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  const tables = p
    ? await db.select().from(restaurantTables).where(eq(restaurantTables.practitionerId, p.id))
    : [];
  const resa = p
    ? await db
        .select()
        .from(restaurantReservations)
        .where(eq(restaurantReservations.practitionerId, p.id))
    : [];
  resa.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const tableNames = Object.fromEntries(tables.map((t) => [t.id, t.name]));

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Restaurant — tables & réservations</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Créneaux de <strong>90 min</strong>. Attribution automatique de la plus petite table
        adaptée au nombre de couverts. Public :{" "}
        <code className="rounded bg-neutral-100 px-1">
          /restauration/reserver?e={p?.slug ?? "SLUG_RESTAURANT"}
        </code>
      </p>
      <RestaurantAdminClient
        initialTables={tables}
        initialReservations={resa.map((r) => ({
          ...r,
          startsAt: r.startsAt.toISOString(),
        }))}
        tableNames={tableNames}
        hasProfile={!!p}
      />
    </div>
  );
}
