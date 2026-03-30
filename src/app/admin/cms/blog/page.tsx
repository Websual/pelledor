"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Post = {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null;
  updatedAt: string;
};

type Category = { id: string; name: string; slug: string };

export default function AdminCmsBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    Promise.all([
      fetch("/api/modules/cms/blog/posts").then((r) => r.json()),
      fetch("/api/modules/cms/blog/categories").then((r) => r.json()),
    ]).then(([p, c]) => {
      setPosts(p.posts ?? []);
      setCategories(c.categories ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await fetch("/api/modules/cms/blog/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    setNewCatName("");
    refresh();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Supprimer cette catégorie ?")) return;
    await fetch(`/api/modules/cms/blog/categories/${id}`, { method: "DELETE" });
    refresh();
  }

  async function deletePost(id: string) {
    if (!confirm("Supprimer cet article ?")) return;
    await fetch(`/api/modules/cms/blog/posts/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement…</p>;
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Blog (site vitrine)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Articles rattachés à votre établissement — visibles sur{" "}
            <code className="rounded bg-gray-100 px-1">/site/&lt;slug&gt;/blog</code>
          </p>
        </div>
        <Link
          href="/admin/cms/blog/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Nouvel article
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-800">Catégories</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <span>
                {c.name}{" "}
                <code className="text-xs text-gray-400">({c.slug})</code>
              </span>
              <button
                type="button"
                onClick={() => deleteCategory(c.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addCategory} className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="Nouvelle catégorie"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <button type="submit" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            Ajouter
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-800">Articles</h2>
        <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <Link href={`/admin/cms/blog/${p.id}`} className="font-medium text-gray-900 hover:underline">
                  {p.title}
                </Link>
                <div className="text-xs text-gray-400">
                  /{p.slug} · {p.publishedAt ? "Publié" : "Brouillon"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deletePost(p.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
        {posts.length === 0 && (
          <p className="mt-4 text-center text-sm text-gray-400">Aucun article pour l’instant.</p>
        )}
      </section>
    </div>
  );
}
