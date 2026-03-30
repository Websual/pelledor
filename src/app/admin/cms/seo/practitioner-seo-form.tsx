"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export function PractitionerSeoForm() {
  const [publicSiteUrl, setPublicSiteUrl] = useState("");
  const [seoRobotsTxt, setSeoRobotsTxt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [needsPractitioner, setNeedsPractitioner] = useState(false);

  const load = useCallback(() => {
    fetch("/api/modules/cms/practitioner-seo")
      .then((r) => {
        if (!r.ok) throw new Error("Chargement impossible");
        return r.json();
      })
      .then(
        (d: {
          publicSiteUrl?: string;
          seoRobotsTxt?: string;
          noPractitioner?: boolean;
        }) => {
          setPublicSiteUrl(d.publicSiteUrl ?? "");
          setSeoRobotsTxt(d.seoRobotsTxt ?? "");
          if (d.noPractitioner) {
            setNeedsPractitioner(true);
            setMessage(
              "Aucune fiche établissement liée à votre compte. Créez un praticien dans « Profil & prestations » ou appliquez votre blueprint."
            );
          } else {
            setNeedsPractitioner(false);
            setMessage(null);
          }
        }
      )
      .catch(() => {
        setNeedsPractitioner(false);
        setMessage("Impossible de charger les réglages.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsPractitioner) return;
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/modules/cms/practitioner-seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicSiteUrl, seoRobotsTxt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erreur");
      setMessage("Enregistré.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Chargement…</p>;

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {message && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {message}
        </p>
      )}
      <div>
        <label className="block text-xs font-semibold uppercase text-gray-500">
          URL publique du site (référence canonical / partage)
        </label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={publicSiteUrl}
          onChange={(e) => setPublicSiteUrl(e.target.value)}
          placeholder="https://www.example.com"
          disabled={needsPractitioner}
        />
        <p className="mt-1 text-xs text-gray-400">
          Optionnel. Utilisée pour JSON-LD Organisation si renseignée ; les pages utilisent sinon l’URL dérivée de
          ce déploiement.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-gray-500">
          robots.txt personnalisé
        </label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
          rows={10}
          value={seoRobotsTxt}
          onChange={(e) => setSeoRobotsTxt(e.target.value)}
          placeholder={`Laisser vide pour le fichier généré (Allow + lien sitemap).`}
          disabled={needsPractitioner}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || needsPractitioner}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "…" : "Enregistrer"}
        </button>
        {needsPractitioner && (
          <Link
            href="/admin/data"
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900"
          >
            Profil & prestations
          </Link>
        )}
        <Link href="/admin" className="rounded-lg border border-gray-200 px-4 py-2 text-sm">
          Retour admin
        </Link>
      </div>
    </form>
  );
}
