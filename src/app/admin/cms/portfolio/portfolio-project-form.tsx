"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { stripHtml } from "@/core/seo/analyze";
import { SeoSuggestionsPanel } from "@/core/seo/seo-suggestions";

type Project = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  descriptionHtml: string;
  descriptionDocument: unknown;
  coverImageUrl: string | null;
  gallery: unknown;
  clientName: string;
  roleLabel: string;
  externalUrl: string | null;
  sortOrder: number;
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

export function PortfolioProjectForm({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const isNew = !projectId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("<p></p>");
  const [descriptionDocumentJson, setDescriptionDocumentJson] = useState("");
  const [galleryJson, setGalleryJson] = useState("[]");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [clientName, setClientName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
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

  const descriptionDocumentForSeo = useMemo(() => {
    try {
      return descriptionDocumentJson.trim() ? JSON.parse(descriptionDocumentJson) : null;
    } catch {
      return null;
    }
  }, [descriptionDocumentJson]);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    fetch(`/api/modules/cms/portfolio/${projectId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Chargement impossible");
        return r.json();
      })
      .then((d: { project: Project }) => {
        const p = d.project;
        setTitle(p.title);
        setSlug(p.slug);
        setSummary(p.summary ?? "");
        setDescriptionHtml(p.descriptionHtml ?? "");
        setDescriptionDocumentJson(
          p.descriptionDocument ? JSON.stringify(p.descriptionDocument, null, 2) : ""
        );
        setGalleryJson(JSON.stringify(p.gallery ?? [], null, 2));
        setCoverImageUrl(p.coverImageUrl ?? "");
        setClientName(p.clientName ?? "");
        setRoleLabel(p.roleLabel ?? "");
        setExternalUrl(p.externalUrl ?? "");
        setSortOrder(p.sortOrder ?? 0);
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
      .catch(() => setError("Projet introuvable"))
      .finally(() => setLoading(false));
  }, [isNew, projectId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    let descriptionDocument: unknown = null;
    const rawDoc = descriptionDocumentJson.trim();
    if (rawDoc) {
      try {
        descriptionDocument = JSON.parse(rawDoc);
      } catch {
        setError("JSON description document invalide");
        setSaving(false);
        return;
      }
    }
    let gallery: unknown;
    try {
      gallery = JSON.parse(galleryJson || "[]");
    } catch {
      setError("JSON galerie invalide");
      setSaving(false);
      return;
    }
    const payload = {
      title,
      slug: slug.trim() || undefined,
      summary,
      descriptionHtml,
      descriptionDocument,
      gallery,
      coverImageUrl: coverImageUrl || null,
      clientName,
      roleLabel,
      externalUrl: externalUrl || null,
      sortOrder,
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
        const r = await fetch("/api/modules/cms/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erreur");
        router.push(`/admin/cms/portfolio/${d.project.id}`);
        router.refresh();
      } else {
        const r = await fetch(`/api/modules/cms/portfolio/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erreur");
        setPublish(!!d.project?.publishedAt);
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
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Client</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Rôle / métier</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={roleLabel}
            onChange={(e) => setRoleLabel(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Résumé</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">URL couverture</label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Lien externe</label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Description (HTML)</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
          rows={12}
          value={descriptionHtml}
          onChange={(e) => setDescriptionHtml(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Description builder (JSON)</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
          rows={6}
          value={descriptionDocumentJson}
          onChange={(e) => setDescriptionDocumentJson(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">
          Galerie JSON (tableau de objets src / alt)
        </label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
          rows={6}
          value={galleryJson}
          onChange={(e) => setGalleryJson(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase">Ordre d’affichage</label>
        <input
          type="number"
          className="mt-1 w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
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
            <label className="block text-xs font-semibold text-gray-500 uppercase">og:image</label>
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
          document={descriptionDocumentForSeo}
          supplementalText={`${stripHtml(summary)} ${stripHtml(descriptionHtml)}`.trim()}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        Publié
      </label>
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "…" : isNew ? "Créer" : "Enregistrer"}
        </button>
        <Link href="/admin/cms/portfolio" className="rounded-lg border border-gray-200 px-4 py-2 text-sm">
          Retour
        </Link>
      </div>
    </form>
  );
}
