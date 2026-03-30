"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, X } from "lucide-react";

interface Profession {
  id: string;
  name: string;
  slug: string;
  description_pseo: string | null;
  _count: { practitioners: number };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

export default function AdminProfessionsPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editProfession, setEditProfession] = useState<Profession | null>(null);
  const [deleteProfession, setDeleteProfession] = useState<Profession | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: professions = [], isLoading } = useQuery({
    queryKey: ["adminProfessions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/professions");
      if (!res.ok) throw new Error("Failed to fetch professions");
      return res.json() as Promise<Profession[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; slug: string; description_pseo?: string | null }) => {
      const res = await fetch("/api/admin/professions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de la création");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProfessions"] });
      setAddOpen(false);
      setToast({ type: "success", message: "Profession créée." });
    },
    onError: (e: Error) => setToast({ type: "error", message: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      slug,
      description_pseo,
      sync_unclaimed_job_titles,
    }: {
      id: string;
      name: string;
      slug: string;
      description_pseo?: string | null;
      sync_unclaimed_job_titles?: boolean;
    }) => {
      const res = await fetch(`/api/admin/professions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description_pseo: description_pseo ?? null,
          sync_unclaimed_job_titles: !!sync_unclaimed_job_titles,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de la modification");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProfessions"] });
      setEditProfession(null);
      setToast({ type: "success", message: "Profession mise à jour." });
    },
    onError: (e: Error) => setToast({ type: "error", message: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/professions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de la suppression");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProfessions"] });
      setDeleteProfession(null);
      setToast({ type: "success", message: "Profession supprimée." });
    },
    onError: (e: Error) => setToast({ type: "error", message: e.message }),
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
            Professions
          </h1>
          <p className="text-anthracite/70">
            Gérer les catégories de praticiens (CRUD)
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une profession
        </Button>
      </div>

      {toast && (
        <div
          className={`rounded-2xl px-4 py-2 text-sm ${
            toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Liste des professions ({professions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {professions.length === 0 ? (
            <p className="text-sm text-anthracite/60 text-center py-8">
              Aucune profession. Cliquez sur &quot;Ajouter une profession&quot; pour en créer une.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-anthracite/80">Nom</th>
                    <th className="text-left py-3 px-2 font-medium text-anthracite/80">Slug</th>
                    <th className="text-left py-3 px-2 font-medium text-anthracite/80">Description PSEO</th>
                    <th className="text-left py-3 px-2 font-medium text-anthracite/80 w-24">Nb praticiens</th>
                    <th className="text-right py-3 px-2 font-medium text-anthracite/80 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {professions.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2 font-medium text-anthracite">{p.name}</td>
                      <td className="py-2.5 px-2 text-anthracite/80 font-mono text-xs">{p.slug}</td>
                      <td className="py-2.5 px-2 text-anthracite/70 max-w-xs truncate" title={p.description_pseo ?? ""}>
                        {p.description_pseo || "—"}
                      </td>
                      <td className="py-2.5 px-2 text-anthracite">{p._count.practitioners}</td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditProfession(p)}
                            className="text-anthracite hover:text-sauge"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteProfession(p)}
                            className="text-anthracite hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Ajouter */}
      {addOpen && (
        <ProfessionFormModal
          title="Ajouter une profession"
          initial={{ name: "", slug: "", description_pseo: "" }}
          onSlugFromName={(name) => slugify(name)}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setAddOpen(false)}
          isSubmitting={createMutation.isPending}
        />
      )}

      {/* Modal Modifier */}
      {editProfession && (
        <ProfessionFormModal
          title="Modifier la profession"
          initial={{
            name: editProfession.name,
            slug: editProfession.slug,
            description_pseo: editProfession.description_pseo ?? "",
          }}
          professionId={editProfession.id}
          practitionerCount={editProfession._count.practitioners}
          onSlugFromName={(name) => slugify(name)}
          onSubmit={(data) =>
            updateMutation.mutate({
              id: editProfession.id,
              name: data.name,
              slug: data.slug,
              description_pseo: data.description_pseo || null,
              sync_unclaimed_job_titles: data.sync_unclaimed_job_titles,
            })
          }
          onCancel={() => setEditProfession(null)}
          isSubmitting={updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteProfession}
        title="Supprimer la profession"
        message={
          deleteProfession
            ? `Supprimer « ${deleteProfession.name } » ? Cette action est irréversible.${deleteProfession._count.practitioners > 0 ? ` ${deleteProfession._count.practitioners} praticien(s) associé(s) : la suppression sera refusée.` : ""}`
            : ""
        }
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        onConfirm={() => deleteProfession && deleteMutation.mutate(deleteProfession.id)}
        onCancel={() => setDeleteProfession(null)}
      />
    </div>
  );
}

interface FormData {
  name: string;
  slug: string;
  description_pseo: string;
  sync_unclaimed_job_titles?: boolean;
}

function ProfessionFormModal({
  title,
  initial,
  professionId,
  practitionerCount,
  onSlugFromName,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  title: string;
  initial: { name: string; slug: string; description_pseo: string };
  professionId?: string;
  practitionerCount?: number;
  onSlugFromName: (name: string) => string;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [descriptionPseo, setDescriptionPseo] = useState(initial.description_pseo);
  const [syncUnclaimedJobTitles, setSyncUnclaimedJobTitles] = useState(false);

  const isEdit = !!professionId;
  const nameOrSlugChanged = isEdit && (name !== initial.name || slug !== initial.slug);
  const canSync = isEdit && nameOrSlugChanged && (practitionerCount ?? 0) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalSlug = slug.trim() || onSlugFromName(name);
    if (!finalSlug) return;
    onSubmit({
      name: name.trim(),
      slug: finalSlug,
      description_pseo: descriptionPseo.trim() || undefined,
      sync_unclaimed_job_titles: canSync ? syncUnclaimedJobTitles : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{title}</CardTitle>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-anthracite/70" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="prof-name">Nom</Label>
              <Input
                id="prof-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEdit) setSlug(onSlugFromName(e.target.value));
                }}
                placeholder="ex. Sophrologue"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="prof-slug">Slug</Label>
              <Input
                id="prof-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ex. sophrologue"
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="prof-desc">Description PSEO</Label>
              <textarea
                id="prof-desc"
                value={descriptionPseo}
                onChange={(e) => setDescriptionPseo(e.target.value)}
                placeholder="Texte pour le référencement (optionnel)"
                rows={3}
                className="mt-1 flex w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-anthracite/50 focus:outline-none focus:ring-2 focus:ring-[#9bb49b] focus:ring-offset-2"
              />
            </div>
            {canSync && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-3">
                <input
                  type="checkbox"
                  id="sync-job-title"
                  checked={syncUnclaimedJobTitles}
                  onChange={(e) => setSyncUnclaimedJobTitles(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-sauge focus:ring-sauge"
                />
                <label htmlFor="sync-job-title" className="text-sm text-anthracite cursor-pointer">
                  Mettre à jour le <strong>job_title</strong> des praticiens <strong>non réclamés</strong> associés à cette profession avec le nouveau nom (cohérence PSEO). Les profils réclamés ne sont pas modifiés.
                </label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
