"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import {
  Plus,
  Megaphone,
  Pencil,
  Trash2,
  X,
  Tag,
  Sparkles,
  Calendar,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ToastContainer, ToastType } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

const SAGE = "#9bb49b";

interface Service {
  id: string;
  name: string;
  price_cents: number;
  duration_min: number;
  [key: string]: unknown;
}

interface MarketingPost {
  id: string;
  service_id: string | null;
  discount_percentage: number | null;
  start_date: string;
  end_date: string;
}

interface PractitionerUpdate {
  id: string;
  title: string;
  text: string;
  type: string;
  promo_text: string | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  marketing_post?: MarketingPost | null;
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Tag; color: string }> = {
  promotion: {
    label: "Promotion",
    icon: Tag,
    color: "bg-[#9bb49b]/20 text-[#5a7a5a] border-[#9bb49b]/40",
  },
  nouveaute: {
    label: "Nouveauté",
    icon: Sparkles,
    color: "bg-[#9bb49b]/20 text-[#5a7a5a] border-[#9bb49b]/40",
  },
};

/** Convertit une Date en string pour datetime-local (YYYY-MM-DDTHH:mm) */
function toDateTimeLocal(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse datetime-local ou ISO → Date, évite Invalid Datetime */
function parseDateTimeLocal(value: string): string | null {
  if (!value || !value.trim()) return null;
  // datetime-local donne "YYYY-MM-DDTHH:mm"
  const normalized = value.trim().length === 16 ? `${value}:00` : value;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function MarketingPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState<"promotion" | "nouveaute">("nouveaute");
  const [promoText, setPromoText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState<string>("");
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: updatesData, isLoading } = useQuery<{ updates: PractitionerUpdate[] }>({
    queryKey: ["practitionerUpdates", data?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/updates");
      if (!res.ok) throw new Error("Failed to fetch updates");
      return res.json();
    },
    enabled: !!data?.user?.id && data?.user?.role === "PRACTITIONER",
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["practitionerServices", data?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/services");
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
    enabled: !!data?.user?.id && data?.user?.role === "PRACTITIONER" && (showForm || type === "promotion"),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      text: string;
      type: string;
      promo_text?: string | null;
      is_active: boolean;
      starts_at?: string | null;
      ends_at?: string | null;
      service_id?: string | null;
      discount_percentage?: number | null;
    }) => {
      const res = await fetch("/api/practitioners/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerUpdates"] });
      resetForm();
      setToasts((prev) => [...prev, { id: crypto.randomUUID(), message: "Actualité créée", type: "success" }]);
    },
    onError: (err: Error) => {
      setToasts((prev) => [...prev, { id: crypto.randomUUID(), message: err.message, type: "error" }]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<{
        title: string;
        text: string;
        type: string;
        promo_text: string | null;
        is_active: boolean;
        starts_at: string | null;
        ends_at: string | null;
        service_id: string | null;
        discount_percentage: number | null;
      }>;
    }) => {
      const res = await fetch(`/api/practitioners/updates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerUpdates"] });
      resetForm();
      setToasts((prev) => [...prev, { id: crypto.randomUUID(), message: "Actualité mise à jour", type: "success" }]);
    },
    onError: (err: Error) => {
      setToasts((prev) => [...prev, { id: crypto.randomUUID(), message: err.message, type: "error" }]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/practitioners/updates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerUpdates"] });
      setDeleteConfirmId(null);
      setToasts((prev) => [...prev, { id: crypto.randomUUID(), message: "Actualité supprimée", type: "success" }]);
    },
    onError: (err: Error) => {
      setToasts((prev) => [...prev, { id: crypto.randomUUID(), message: err.message, type: "error" }]);
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setText("");
    setType("nouveaute");
    setPromoText("");
    setIsActive(true);
    setStartsAt(toDateTimeLocal(new Date()));
    setEndsAt("");
    setServiceId("");
    setDiscountPercentage("");
  };

  const startEdit = (u: PractitionerUpdate) => {
    setEditingId(u.id);
    setTitle(u.title);
    setText(u.text);
    setType(u.type as "promotion" | "nouveaute");
    setPromoText(u.promo_text || "");
    setIsActive(u.is_active);
    setStartsAt(u.starts_at ? toDateTimeLocal(new Date(u.starts_at)) : toDateTimeLocal(new Date()));
    setEndsAt(u.ends_at ? toDateTimeLocal(new Date(u.ends_at)) : "");
    setServiceId(u.marketing_post?.service_id || "");
    setDiscountPercentage(u.marketing_post?.discount_percentage != null ? String(u.marketing_post.discount_percentage) : "");
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      setToasts((prev) => [...prev, { id: crypto.randomUUID(), message: "Titre et texte requis", type: "error" }]);
      return;
    }
    const startsAtIso = parseDateTimeLocal(startsAt);
    const endsAtIso = parseDateTimeLocal(endsAt);
    const payload = {
      title: title.trim(),
      text: text.trim(),
      type,
      promo_text: promoText.trim() || null,
      is_active: isActive,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      service_id: type === "promotion" && serviceId ? serviceId : null,
      discount_percentage: type === "promotion" && discountPercentage ? parseInt(discountPercentage, 10) : null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  useEffect(() => {
    if (data && data.user.role !== "PRACTITIONER") {
      router.push("/");
    }
  }, [data, router]);

  if (!data) {
    return <PageSkeleton />;
  }

  if (data.user.role !== "PRACTITIONER") {
    return null;
  }

  const updates = updatesData?.updates ?? [];

  const isUpdateActive = (u: PractitionerUpdate) => {
    if (!u.is_active) return false;
    if (!u.ends_at) return true;
    return new Date(u.ends_at) >= new Date();
  };

  return (
    <div className="p-8 bg-[#f7f7f7] min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-anthracite flex items-center gap-2">
              <Megaphone className="h-6 w-6" style={{ color: SAGE }} />
              Marketing
            </h1>
            <p className="text-anthracite/70 mt-1">
              Publiez des actualités visibles sur votre fiche publique (promotions, nouveautés).
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="text-white"
            style={{ backgroundColor: SAGE }}
          >
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? "Annuler" : "Nouvelle actualité"}
          </Button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <Card className="mb-8 rounded-3xl border-[#9bb49b]/30 shadow-sm overflow-hidden">
            <CardHeader className="rounded-t-3xl" style={{ backgroundColor: `${SAGE}15` }}>
              <CardTitle className="text-lg">
                {editingId ? "Modifier l'actualité" : "Nouvelle actualité"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Nouvelle formule découverte"
                    maxLength={100}
                    className="mt-1 rounded-2xl border-[#9bb49b]/30 focus:ring-[#9bb49b]/30"
                  />
                </div>
                <div>
                  <Label htmlFor="text">Texte</Label>
                  <textarea
                    id="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Décrivez votre actualité en quelques phrases..."
                    rows={4}
                    maxLength={1000}
                    className="mt-1 w-full rounded-2xl border border-[#9bb49b]/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9bb49b]/30"
                  />
                  <p className="text-xs text-anthracite/50 mt-1">{text.length}/1000</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="nouveaute"
                        checked={type === "nouveaute"}
                        onChange={() => setType("nouveaute")}
                        style={{ accentColor: SAGE }}
                      />
                      <Sparkles className="h-4 w-4" style={{ color: SAGE }} />
                      Nouveauté
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="promotion"
                        checked={type === "promotion"}
                        onChange={() => setType("promotion")}
                        style={{ accentColor: SAGE }}
                      />
                      <Tag className="h-4 w-4" style={{ color: SAGE }} />
                      Promotion
                    </label>
                  </div>
                </div>

                {type === "promotion" && (
                  <>
                    <div>
                      <Label htmlFor="service">Service concerné (optionnel)</Label>
                      <select
                        id="service"
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-[#9bb49b]/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9bb49b]/30"
                      >
                        <option value="">Tous les services</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({(s.price_cents / 100).toFixed(2)} €)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="discount">Pourcentage de remise (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min={1}
                        max={100}
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(e.target.value)}
                        placeholder="Ex: 20 pour -20%"
                        className="mt-1 rounded-2xl border-[#9bb49b]/30 focus:ring-[#9bb49b]/30 w-32"
                      />
                    </div>
                    <div>
                      <Label htmlFor="promo_text">Badge promo (sur le bouton Réserver)</Label>
                      <Input
                        id="promo_text"
                        value={promoText}
                        onChange={(e) => setPromoText(e.target.value)}
                        placeholder="Ex: -20% séance découverte"
                        maxLength={80}
                        className="mt-1 rounded-2xl border-[#9bb49b]/30 focus:ring-[#9bb49b]/30"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded"
                      style={{ accentColor: SAGE }}
                    />
                    <span className="text-sm">Actif (visible sur ma fiche)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="starts_at" className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" style={{ color: SAGE }} />
                      Date de début
                    </Label>
                    <Input
                      id="starts_at"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="mt-1 rounded-2xl border-[#9bb49b]/30 focus:ring-[#9bb49b]/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ends_at" className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" style={{ color: SAGE }} />
                      Date de fin (optionnel)
                    </Label>
                    <Input
                      id="ends_at"
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      min={startsAt || undefined}
                      className="mt-1 rounded-2xl border-[#9bb49b]/30 focus:ring-[#9bb49b]/30"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="text-white"
                    style={{ backgroundColor: SAGE }}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Enregistrement..."
                      : editingId
                        ? "Mettre à jour"
                        : "Créer"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="border-[#9bb49b]/50 text-[#5a7a5a] hover:bg-[#9bb49b]/10"
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Aperçu : tableau des actualités */}
        {isLoading ? (
          <Skeleton className="h-48 rounded-3xl" />
        ) : updates.length === 0 ? (
          <Card className="rounded-3xl border-2 border-dashed border-[#9bb49b]/40 overflow-hidden">
            <CardContent className="py-16 text-center">
              <Megaphone className="h-14 w-14 mx-auto mb-4 opacity-30" style={{ color: SAGE }} />
              <h3 className="font-semibold text-anthracite mb-2">Aucune actualité</h3>
              <p className="text-sm text-anthracite/70 mb-6 max-w-sm mx-auto">
                Créez une promotion ou une nouveauté pour la mettre en avant sur votre fiche publique.
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="text-white"
                style={{ backgroundColor: SAGE }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer une actualité
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl border-[#9bb49b]/30 shadow-sm overflow-hidden">
            <CardHeader className="rounded-t-3xl" style={{ backgroundColor: `${SAGE}12` }}>
              <CardTitle className="text-base">Vos actualités</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#9bb49b]/20">
                      <th className="text-left py-4 px-5 font-semibold text-anthracite">Type</th>
                      <th className="text-left py-4 px-5 font-semibold text-anthracite">Titre</th>
                      <th className="text-left py-4 px-5 font-semibold text-anthracite">Dates</th>
                      <th className="text-left py-4 px-5 font-semibold text-anthracite">Statut</th>
                      <th className="text-right py-4 px-5 font-semibold text-anthracite">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {updates.map((u) => {
                      const typeInfo = TYPE_LABELS[u.type] || TYPE_LABELS.nouveaute;
                      const Icon = typeInfo.icon;
                      const active = isUpdateActive(u);
                      return (
                        <tr
                          key={u.id}
                          className="border-b border-[#9bb49b]/10 last:border-0 hover:bg-[#9bb49b]/5 transition-colors"
                        >
                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border ${typeInfo.color}`}
                            >
                              <Icon className="h-3 w-3" />
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="font-medium text-anthracite">{u.title}</span>
                            {u.marketing_post?.discount_percentage != null && (
                              <span className="ml-2 text-xs text-[#5a7a5a]">
                                -{u.marketing_post.discount_percentage}%
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-anthracite/70">
                            {format(new Date(u.starts_at), "d MMM yyyy", { locale: fr })}
                            {u.ends_at && (
                              <> → {format(new Date(u.ends_at), "d MMM yyyy", { locale: fr })}</>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-xl text-xs font-medium ${
                                active
                                  ? "bg-[#9bb49b]/20 text-[#5a7a5a] border border-[#9bb49b]/40"
                                  : "bg-anthracite/10 text-anthracite/60 border border-anthracite/20"
                              }`}
                            >
                              {active ? "Actif" : "Terminé"}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(u)}
                                className="text-anthracite/70 hover:bg-[#9bb49b]/10"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(u.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirmId}
        title="Supprimer cette actualité ?"
        message="Cette action est irréversible."
        confirmText="Supprimer"
        variant="destructive"
        onConfirm={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ToastContainer
        toasts={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
