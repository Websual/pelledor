"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Project = {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null;
  sortOrder: number;
};

export default function AdminCmsPortfolioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch("/api/modules/cms/portfolio")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function remove(id: string) {
    if (!confirm("Supprimer ce projet ?")) return;
    await fetch(`/api/modules/cms/portfolio/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Portfolio</h1>
          <p className="mt-1 text-sm text-gray-500">
            Projets affichés sur{" "}
            <code className="rounded bg-gray-100 px-1">/site/&lt;slug&gt;/portfolio</code>
          </p>
        </div>
        <Link
          href="/admin/cms/portfolio/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Nouveau projet
        </Link>
      </div>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div>
              <Link href={`/admin/cms/portfolio/${p.id}`} className="font-medium text-gray-900 hover:underline">
                {p.title}
              </Link>
              <div className="text-xs text-gray-400">
                /{p.slug} · ordre {p.sortOrder} · {p.publishedAt ? "Publié" : "Brouillon"}
              </div>
            </div>
            <button type="button" onClick={() => remove(p.id)} className="text-xs text-red-500 hover:underline">
              Supprimer
            </button>
          </li>
        ))}
      </ul>
      {projects.length === 0 && (
        <p className="text-center text-sm text-gray-400">Aucun projet.</p>
      )}
    </div>
  );
}
