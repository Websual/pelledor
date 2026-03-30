"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function Form() {
  const sp = useSearchParams();
  const e = sp.get("e") || "mon-restaurant";
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const r = await fetch("/api/modules/restaurant/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishment: e,
        date: fd.get("date"),
        time: fd.get("time"),
        partySize: fd.get("partySize"),
        clientName: fd.get("clientName"),
        clientEmail: fd.get("clientEmail"),
        clientPhone: fd.get("clientPhone"),
        notes: fd.get("notes"),
      }),
    });
    const j = await r.json();
    if (r.ok) {
      setOk(true);
      setMsg(`Réservé — table ${j.tableName}`);
    } else setMsg(j.error || "Erreur");
  }

  if (ok) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-green-700">{msg}</p>
        <Link href="/" className="mt-6 inline-block text-blue-600 underline">
          Accueil
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-xl font-semibold">Réserver une table</h1>
      <p className="mt-1 text-sm text-neutral-500">Établissement : {e}</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input type="date" name="date" required className="w-full rounded border px-3 py-2" />
        <select name="time" required className="w-full rounded border px-3 py-2">
          <option value="12:00">12:00</option>
          <option value="12:30">12:30</option>
          <option value="19:00">19:00</option>
          <option value="19:30">19:30</option>
          <option value="20:00">20:00</option>
          <option value="20:30">20:30</option>
        </select>
        <input
          type="number"
          name="partySize"
          min={1}
          max={20}
          defaultValue={2}
          placeholder="Couverts"
          className="w-full rounded border px-3 py-2"
        />
        <input name="clientName" placeholder="Nom" required className="w-full rounded border px-3 py-2" />
        <input
          name="clientEmail"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded border px-3 py-2"
        />
        <input name="clientPhone" placeholder="Téléphone" className="w-full rounded border px-3 py-2" />
        <textarea name="notes" placeholder="Allergie, enfants…" className="w-full rounded border px-3 py-2" rows={2} />
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button type="submit" className="w-full rounded bg-neutral-900 py-3 text-white">
          Confirmer
        </button>
      </form>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm">Chargement…</p>}>
      <Form />
    </Suspense>
  );
}
