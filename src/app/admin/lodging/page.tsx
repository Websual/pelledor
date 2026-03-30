import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners, rooms } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminLodgingClient } from "./client";

export default async function AdminLodgingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  const list = p
    ? await db.select().from(rooms).where(eq(rooms.practitionerId, p.id))
    : [];
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Chambres & hébergement</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {!p ? (
          <>
            Créez d’abord un profil établissement (bouton « Appliquer blueprint
            gîte »), puis ajoutez des chambres. URL réservation :{" "}
            <code className="rounded bg-neutral-100 px-1">
              /hebergement/chambre/SLUG?e=SLUG_ETAB
            </code>
          </>
        ) : (
          <>
            Établissement <strong>{p.slug}</strong> — pages :{" "}
            <code className="rounded bg-neutral-100 px-1">
              /hebergement/chambre/SLUG_CHAMBRE?e={p.slug}
            </code>
          </>
        )}
      </p>
      <AdminLodgingClient initialRooms={list} hasProfile={!!p} />
    </div>
  );
}
