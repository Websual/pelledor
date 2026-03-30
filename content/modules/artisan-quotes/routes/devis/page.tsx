"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function Form() {
  const sp = useSearchParams();
  const e = sp.get("e") || "mon-entreprise";
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const r = await fetch("/api/modules/artisan-quotes/quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishment: e,
        clientName: fd.get("clientName"),
        clientEmail: fd.get("clientEmail"),
        clientPhone: fd.get("clientPhone"),
        address: fd.get("address"),
        description: fd.get("description"),
      }),
    });
    const j = await r.json();
    if (r.ok) {
      setOk(true);
      setMsg("Demande envoyée. L’artisan vous recontacte sous peu.");
    } else setMsg(j.error || "Erreur");
  }

  if (ok) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-green-800">{msg}</p>
        <Link href="/" className="mt-6 inline-block text-blue-600 underline">
          Retour accueil
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-semibold">Demande de devis</h1>
      <p className="mt-1 text-sm text-neutral-500">Artisan : {e}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          name="clientName"
          placeholder="Nom complet"
          required
          className="w-full rounded-lg border px-4 py-3"
        />
        <input
          name="clientEmail"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-lg border px-4 py-3"
        />
        <input
          name="clientPhone"
          placeholder="Téléphone"
          className="w-full rounded-lg border px-4 py-3"
        />
        <input
          name="address"
          placeholder="Adresse des travaux (ville, rue…)"
          className="w-full rounded-lg border px-4 py-3"
        />
        <textarea
          name="description"
          placeholder="Décrivez votre besoin (urgence, surface, type de travaux…)"
          required
          rows={5}
          className="w-full rounded-lg border px-4 py-3"
        />
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 py-3 font-medium text-white"
        >
          Envoyer la demande
        </button>
      </form>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Chargement…</p>}>
      <Form />
    </Suspense>
  );
}
