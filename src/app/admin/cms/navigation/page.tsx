"use client";

import { useCallback, useEffect, useState } from "react";
import type { NavLinkType } from "@/core/cms/practitioner-utils";
import { NAV_LINK_TYPES } from "@/core/cms/practitioner-utils";

type NavRow = {
  label: string;
  linkType: NavLinkType;
  linkTarget: string;
  sortOrder: number;
};

const TYPE_LABELS: Record<NavLinkType, string> = {
  page: "Page builder (slug)",
  external: "URL externe",
  blog: "Index blog",
  portfolio: "Index portfolio",
  blog_category: "Catégorie blog (slug)",
};

export default function AdminSiteNavigationPage() {
  const [items, setItems] = useState<NavRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/modules/cms/navigation")
      .then((r) => r.json())
      .then((d) => {
        const raw = d.items ?? [];
        setItems(
          raw.map((x: { label: string; linkType: string; linkTarget: string; sortOrder: number }) => ({
            label: x.label,
            linkType: (NAV_LINK_TYPES.includes(x.linkType as NavLinkType)
              ? x.linkType
              : "page") as NavLinkType,
            linkTarget: x.linkTarget ?? "",
            sortOrder: x.sortOrder ?? 0,
          }))
        );
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const t = next[i];
    next[i] = next[j]!;
    next[j] = t!;
    setItems(next.map((row, idx) => ({ ...row, sortOrder: idx })));
  }

  function addRow() {
    setItems([...items, { label: "Nouveau", linkType: "page", linkTarget: "home", sortOrder: items.length }]);
  }

  function removeRow(i: number) {
    setItems(items.filter((_, idx) => idx !== i).map((row, idx) => ({ ...row, sortOrder: idx })));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const r = await fetch("/api/modules/cms/navigation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((row, i) => ({
          label: row.label,
          linkType: row.linkType,
          linkTarget: row.linkTarget,
          sortOrder: i,
        })),
      }),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) {
      setMessage(d.error || "Erreur");
      return;
    }
    setMessage("Menu enregistré.");
    setItems(
      (d.items ?? []).map((x: { label: string; linkType: string; linkTarget: string; sortOrder: number }) => ({
        label: x.label,
        linkType: x.linkType as NavLinkType,
        linkTarget: x.linkTarget ?? "",
        sortOrder: x.sortOrder ?? 0,
      }))
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Menu du site vitrine</h1>
        <p className="mt-1 text-sm text-gray-500">
          Liens affichés au-dessus des pages{" "}
          <code className="rounded bg-gray-100 px-1">/site/&lt;votre-slug&gt;/…</code>
        </p>
      </div>
      {message && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{message}</p>
      )}
      <div className="space-y-3">
        {items.map((row, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-3">
            <div className="min-w-[120px] flex-1">
              <label className="text-[10px] font-semibold uppercase text-gray-400">Libellé</label>
              <input
                className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                value={row.label}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...row, label: e.target.value };
                  setItems(next);
                }}
              />
            </div>
            <div className="w-44">
              <label className="text-[10px] font-semibold uppercase text-gray-400">Type</label>
              <select
                className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                value={row.linkType}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...row, linkType: e.target.value as NavLinkType };
                  setItems(next);
                }}
              >
                {NAV_LINK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="text-[10px] font-semibold uppercase text-gray-400">
                Cible (slug page, URL, slug catégorie…)
              </label>
              <input
                className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                value={row.linkTarget}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...row, linkTarget: e.target.value };
                  setItems(next);
                }}
                disabled={row.linkType === "blog" || row.linkType === "portfolio"}
              />
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded border border-gray-200 px-2 py-1 text-xs"
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded border border-gray-200 px-2 py-1 text-xs"
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
              <button type="button" className="text-xs text-red-500 px-2" onClick={() => removeRow(i)}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
        >
          + Ligne
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "…" : "Enregistrer le menu"}
        </button>
      </div>
    </div>
  );
}
