import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners, quoteRequests } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DevisAdminClient } from "./client";

export default async function AdminDevisPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  const quotes = p
    ? await db
        .select()
        .from(quoteRequests)
        .where(eq(quoteRequests.practitionerId, p.id))
    : [];
  quotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Demandes de devis</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Flux blueprint <strong>Artisan</strong> : les clients remplissent{" "}
        <code className="rounded bg-neutral-100 px-1">/devis?e={p?.slug ?? "mon-entreprise"}</code>
        . Vous marquez le suivi puis pouvez générer une <strong>facture brouillon</strong> (montant
        estimatif).
      </p>
      <DevisAdminClient quotes={quotes} hasProfile={!!p} />
    </div>
  );
}
