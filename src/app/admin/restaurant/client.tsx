"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type T = { id: string; name: string; seats: number; active: boolean };
type R = {
  id: string;
  tableId: string;
  startsAt: string;
  partySize: number;
  clientName: string;
  clientEmail: string;
  status: string;
};

export function RestaurantAdminClient({
  initialTables,
  initialReservations,
  tableNames,
  hasProfile,
}: {
  initialTables: T[];
  initialReservations: R[];
  tableNames: Record<string, string>;
  hasProfile: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function addTable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/modules/restaurant/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        seats: fd.get("seats"),
      }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Table ajoutée" : j.error);
    if (r.ok) router.refresh();
  }

  return (
    <div className="mt-8 space-y-10">
      {msg && <p className="text-sm text-neutral-600">{msg}</p>}
      {hasProfile && (
        <form onSubmit={addTable} className="flex flex-wrap gap-2 rounded border bg-white p-4">
          <input name="name" placeholder="Nom table (ex: Terrasse 1)" className="rounded border px-2 py-1" required />
          <input name="seats" type="number" defaultValue={2} className="w-20 rounded border px-2 py-1" />
          <button type="submit" className="rounded bg-neutral-900 px-3 py-1 text-sm text-white">
            Ajouter table
          </button>
        </form>
      )}
      <section>
        <h2 className="font-medium">Tables</h2>
        <ul className="mt-2 divide-y rounded border bg-white text-sm">
          {initialTables.map((t) => (
            <li key={t.id} className="flex justify-between px-3 py-2">
              <span>{t.name}</span>
              <span className="text-neutral-500">{t.seats} couverts</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-medium">Réservations récentes</h2>
        <ul className="mt-2 divide-y rounded border bg-white text-sm">
          {initialReservations.slice(0, 30).map((r) => (
            <li key={r.id} className="px-3 py-2">
              <div className="font-medium">
                {new Date(r.startsAt).toLocaleString("fr-FR")} — {r.clientName} ({r.partySize}{" "}
                pers.)
              </div>
              <div className="text-xs text-neutral-500">
                {tableNames[r.tableId] ?? r.tableId} · {r.clientEmail}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
