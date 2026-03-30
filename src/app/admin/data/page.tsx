import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners } from "@/core/db/schema.modules";
import { redirect } from "next/navigation";
import { DataSeedForms } from "./seed-forms";

export default async function AdminDataPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/admin");
  const db = getDb();
  const pracs = await db.select().from(practitioners);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Donnees demo</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Creer praticien, prestation, evenement, article (API modules). Besoin d
        etre connecte admin.
      </p>
      <DataSeedForms practitioners={pracs} />
    </div>
  );
}
