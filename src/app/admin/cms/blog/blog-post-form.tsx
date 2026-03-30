"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { stripHtml } from "@/core/seo/analyze";
import { SeoSuggestionsPanel } from "@/core/seo/seo-suggestions";

type Category = { id: string; name: string; slug: string };

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  bodyDocument: unknown;
  coverImageUrl: string | null;
  categoryId: string | null;
  publishedAt: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  noindex?: boolean;
  targetKeyword?: string | null;
};

export function BlogPostForm({ postId }: { postId?: string }) {
  const router = useRouter();
  const isNew = !postId;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [bodyDocumentJson, setBodyDocumentJson] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [publish, setPublish] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [noindex, setNoindex] = useState(false);
  const [targetKeyword, setTargetKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bodyDocumentForSeo = useMemo(() => {
    try {
      return bodyDocumentJson.trim() ? JSON.parse(bodyDocumentJson) : null;
    } catch {
      return null;
    }
  }, [bodyDocumentJson]);

  const loadCategories = useCallback(() => {
    fetch("/api/modules/cms/blog/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    fetch(`/api/modules/cms/blog/posts/${postId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Chargement impossible");
        return r.json();
      })
      .then((d: { post: PostRow }) => {
        const p = d.post;
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt ?? "");
        setBodyHtml(p.bodyHtml ?? "");
        setBodyDocumentJson(
          p.bodyDocument ? JSON.stringify(p.bodyDocument, null, 2) : ""
        );
        setCoverImageUrl(p.coverImageUrl ?? "");
        setCategoryId(p.categoryId ?? "");
        setPublish(!!p.publishedAt);
        setMetaTitle(p.metaTitle ?? "");
        setMetaDescription(p.metaDescription ?? "");
        setCanonicalUrl(p.canonicalUrl ?? "");
        setOgTitle(p.ogTitle ?? "");
        setOgDescription(p.ogDescription ?? "");
        setOgImageUrl(p.ogImageUrl ?? "");
        setNoindex(!!p.noindex);
        setTargetKeyword(p.targetKeyword ?? "");
      })
      .catch(() => setError("Article introuvable"))
      .finally(() => setLoading(false));
  }, [isNew, postId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    let bodyDocument: unknown = null;
    const raw = bodyDocumentJson.trim();
    if (raw) {
      try {
        bodyDocument = JSON.parse(raw);
      } catch {
        setError("JSON body document invalide");
        setSaving(false);
        return;
      }
    }
    const payload = {
      title,
      slug: slug.trim() || undefined,
      excerpt,
      bodyHtml,
      bodyDocument,
      coverImageUrl: coverImageUrl || null,
      categoryId: categoryId || null,
      publish,
      metaTitle,
      metaDescription,
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImageUrl,
      noindex,
      targetKeyword,
    };
    try {
      if (isNew) {
        const r = await fetch("/api/modules/cms/blog/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erreur");
        router.push(`/admin/cms/blog/${d.post.id}`);
        router.refresh();
      } else {
        const r = await fetch(`/api/modules/cms/blog/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erreur");
        setPublish(!!d.post?.publishedAt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Titre</label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Slug</label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono text-xs"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="auto depuis le titre"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Catégorie</label>
        <select
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">— Aucune —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Extrait</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          rows={3}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Image de couverture (URL)</label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Corps (HTML)</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
          rows={14}
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">
          Document builder (JSON optionnel — prioritaire sur le HTML si valide)
        </label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
          rows={8}
          value={bodyDocumentJson}
          onChange={(e) => setBodyDocumentJson(e.target.value)}
          placeholder='{"version":1,"rows":[...]}'
        />
      </div>
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Référencement</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Titre meta</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Meta description</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            rows={3}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">URL canonique</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase">og:title</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={ogTitle}
              onChange={(e) => setOgTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase">og:image (URL)</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">og:description</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            rows={2}
            value={ogDescription}
            onChange={(e) => setOgDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Mot-clé cible</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={targetKeyword}
            onChange={(e) => setTargetKeyword(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} />
          noindex
        </label>
        <SeoSuggestionsPanel
          targetKeyword={targetKeyword}
          metaTitle={metaTitle}
          metaDescription={metaDescription}
          document={bodyDocumentForSeo}
          supplementalText={stripHtml(bodyHtml)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        Publié sur le site vitrine
      </label>
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "…" : isNew ? "Créer" : "Enregistrer"}
        </button>
        <Link href="/admin/cms/blog" className="rounded-lg border border-gray-200 px-4 py-2 text-sm">
          Retour
        </Link>
      </div>
    </form>
  );
}
