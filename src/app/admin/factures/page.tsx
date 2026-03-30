import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { invoices, practitioners } from "@/core/db/schema.modules";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InvoiceActions } from "./invoice-actions";

export default async function AdminFacturesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const db = getDb();
  const prac = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  let list: {
    id: string;
    invoiceNumber: string;
    totalCents: number;
    status: string;
    createdAt: Date;
  }[] = [];
  if (prac) {
    list = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        totalCents: invoices.totalCents,
        status: invoices.status,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(eq(invoices.practitionerId, prac.id))
      .orderBy(desc(invoices.createdAt));
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Factures</h1>
      {!prac && (
        <p className="mt-2 text-sm text-amber-800">
          Fiche praticien liee requise. <Link href="/admin/data" className="underline">Donnees demo</Link>
        </p>
      )}
      <ul className="mt-6 space-y-2">
        {list.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"
          >
            <span>
              {inv.invoiceNumber} — {(inv.totalCents / 100).toFixed(2)} EUR —{" "}
              <span className="text-neutral-500">{inv.status}</span>
            </span>
            {inv.status !== "paid" && <InvoiceActions id={inv.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
