"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Q = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  address: string | null;
  description: string;
  status: string;
  convertedInvoiceId: string | null;
  createdAt: Date;
};

const STATUS_LABEL: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  quoted: "Devis envoyé",
  won: "Gagné",
  lost: "Perdu",
};

export function DevisAdminClient({
  quotes,
  hasProfile,
}: {
  quotes: Q[];
  hasProfile: boolean;
}) {
  const router = useRouter();
  const [amountById, setAmountById] = useState<Record<string, string>>({});

  async function setStatus(id: string, status: string) {
    await fetch(`/api/modules/artisan-quotes/quote-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function draftInvoice(id: string) {
    const euros = parseFloat((amountById[id] || "0").replace(",", "."));
    const cents = Math.round(euros * 100);
    if (cents < 1) return;
    await fetch(`/api/modules/artisan-quotes/quote-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ createDraftInvoice: true, amountCents: cents }),
    });
    router.refresh();
  }

  if (!hasProfile) {
    return (
      <p className="mt-8 text-sm text-amber-800">
        Créez d’abord votre fiche entreprise (blueprint Artisan ou Données demo).
      </p>
    );
  }

  return (
    <ul className="mt-8 space-y-6">
      {quotes.map((q) => (
        <li
          key={q.id}
          className="rounded-lg border bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{q.clientName}</p>
              <p className="text-sm text-neutral-600">
                {q.clientEmail}
                {q.clientPhone ? ` · ${q.clientPhone}` : ""}
              </p>
              {q.address && (
                <p className="mt-1 text-sm text-neutral-500">{q.address}</p>
              )}
            </div>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
              {STATUS_LABEL[q.status] ?? q.status}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm">{q.description}</p>
          <p className="mt-2 text-xs text-neutral-400">
            {new Date(q.createdAt).toLocaleString("fr-FR")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            {q.status === "new" && (
              <button
                type="button"
                onClick={() => setStatus(q.id, "contacted")}
                className="rounded bg-neutral-200 px-3 py-1 text-sm"
              >
                Marquer contacté
              </button>
            )}
            <select
              value={q.status}
              onChange={(e) => setStatus(q.id, e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Montant estimatif (€)"
                className="w-36 rounded border px-2 py-1 text-sm"
                value={amountById[q.id] ?? ""}
                onChange={(e) =>
                  setAmountById((m) => ({
                    ...m,
                    [q.id]: e.target.value,
                  }))
                }
              />
              <button
                type="button"
                onClick={() =>
                  draftInvoice(
                    q.id,
                  )
                }
                className="rounded bg-amber-700 px-3 py-1 text-sm text-white"
              >
                Facture brouillon
              </button>
            </div>
            {q.convertedInvoiceId && (
              <span className="text-xs text-green-700">
                Facture liée — voir{" "}
                <a href="/admin/factures" className="underline">
                  Factures
                </a>
              </span>
            )}
          </div>
        </li>
      ))}
      {quotes.length === 0 && (
        <p className="text-sm text-neutral-500">Aucune demande pour l’instant.</p>
      )}
    </ul>
  );
}
