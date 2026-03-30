"use client";

import { Card, CardContent, Button } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  Pencil,
  User,
  Image,
  FileText,
  CheckCircle,
  Loader2,
  Phone,
  Globe,
  Instagram,
  Smartphone,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import NextImage from "next/image";

interface Prospect {
  id: string;
  title: string;
  slug: string;
  locationCity: string;
  contactEmail: string | null;
  phone: string | null;
  website: string | null;
  instagramUrl: string | null;
  photoUrl: string | null;
  profession: { id: string; name: string } | null;
  completionScore: number;
  acquisitionInvitationSentAt: string | null;
}

interface AcquisitionResponse {
  prospects: Prospect[];
  professions: { id: string; name: string }[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalProspects: number;
    invitationsSent: number;
    claimsCount: number;
    conversionRate: number;
  };
}

export default function AdminAcquisitionPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [city, setCity] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");
  const [professionId, setProfessionId] = useState("");
  const [completionScore, setCompletionScore] = useState<string>("all");
  const [hasEmail, setHasEmail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCity(city), 500);
    return () => clearTimeout(t);
  }, [city]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedCity, professionId, completionScore, hasEmail]);

  const { data: acqData, isLoading, isFetching } = useQuery<AcquisitionResponse>({
    queryKey: ["adminAcquisition", debouncedCity, professionId, completionScore, hasEmail, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
      });
      if (debouncedCity) params.append("city", debouncedCity);
      if (professionId) params.append("professionId", professionId);
      if (completionScore && completionScore !== "all")
        params.append("completionScore", completionScore);
      if (hasEmail) params.append("hasEmail", "true");
      const res = await fetch(`/api/admin/acquisition?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!data && data.user.role === "ADMIN",
  });

  const inviteMutation = useMutation({
    mutationFn: async (practitionerId: string) => {
      const res = await fetch(`/api/admin/acquisition/${practitionerId}/invite`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Échec de l'envoi");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAcquisition"] });
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: async ({ id, contact_email }: { id: string; contact_email: string }) => {
      const res = await fetch(`/api/admin/acquisition/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Échec de la mise à jour");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAcquisition"] });
      setEditingEmailId(null);
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/admin/acquisition/bulk-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Échec de l'envoi");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["adminAcquisition"] });
      setSelectedIds(new Set());
      if (data?.errors?.length) {
        alert(`${data.sent} envoyés. Erreurs:\n${data.errors.join("\n")}`);
      }
    },
  });

  const prospects = acqData?.prospects ?? [];
  const selectableWithEmail = prospects.filter(
    (p) => p.contactEmail && !p.acquisitionInvitationSentAt
  );
  const selectableIds = new Set(selectableWithEmail.map((p) => p.id));
  const selectedCount = Array.from(selectedIds).filter((id) =>
    selectableIds.has(id)
  ).length;
  const allSelectableSelected =
    selectableWithEmail.length > 0 &&
    selectedCount === selectableWithEmail.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(selectableWithEmail.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkInvite = () => {
    const ids = Array.from(selectedIds).filter((id) => selectableIds.has(id));
    if (ids.length === 0) return;
    if (confirm(`Envoyer l'invitation à ${ids.length} prospect(s) ?`)) {
      bulkInviteMutation.mutate(ids);
    }
  };

  if (!data || data.user.role !== "ADMIN") {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  const stats = acqData?.stats;
  const pagination = acqData?.pagination;
  const professions = acqData?.professions ?? [];

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
            Acquisition — Shadow Profiles
          </h1>
          <p className="text-anthracite/70">
            Gérer les praticiens qui n&apos;ont pas encore réclamé leur profil
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white rounded-3xl border border-gray-100">
            <CardContent className="p-5">
              <p className="text-sm text-anthracite/60 mb-1">Total des prospects</p>
              <p className="text-2xl font-bold text-anthracite">
                {stats?.totalProspects != null
                  ? stats.totalProspects.toLocaleString("fr-FR")
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-3xl border border-gray-100">
            <CardContent className="p-5">
              <p className="text-sm text-anthracite/60 mb-1">Invitations envoyées</p>
              <p className="text-2xl font-bold text-[#9bb49b]">
                {stats?.invitationsSent != null
                  ? stats.invitationsSent.toLocaleString("fr-FR")
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-3xl border border-gray-100">
            <CardContent className="p-5">
              <p className="text-sm text-anthracite/60 mb-1">Claims (réclamations)</p>
              <p className="text-2xl font-bold text-anthracite">
                {stats?.claimsCount != null
                  ? stats.claimsCount.toLocaleString("fr-FR")
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-3xl border border-gray-100">
            <CardContent className="p-5">
              <p className="text-sm text-anthracite/60 mb-1">Taux de conversion</p>
              <p className="text-2xl font-bold text-[#9bb49b]">
                {stats?.conversionRate != null ? `${stats.conversionRate} %` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-anthracite/40" />
            <input
              type="text"
              placeholder="Filtrer par ville..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9bb49b] focus:border-transparent"
            />
          </div>
          <select
            value={professionId}
            onChange={(e) => setProfessionId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9bb49b]"
          >
            <option value="">Toutes les professions</option>
            {professions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-anthracite/60">Score :</span>
            {[
              { val: "all", label: "Tous" },
              { val: "2", label: "Complet" },
              { val: "1", label: "Partiel" },
              { val: "0", label: "Vide" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setCompletionScore(opt.val)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  completionScore === opt.val
                    ? "bg-[#9bb49b] text-white"
                    : "bg-white border border-gray-200 text-anthracite hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasEmail}
              onChange={(e) => setHasEmail(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#9bb49b] focus:ring-[#9bb49b]"
            />
            <span className="text-sm text-anthracite">Avec email uniquement</span>
          </label>

          {/* Actions de masse */}
          {selectedCount > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-anthracite/70">
                {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
              </span>
              <Button
                size="sm"
                onClick={handleBulkInvite}
                disabled={bulkInviteMutation.isPending}
                className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
              >
                {bulkInviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Mail className="h-4 w-4 mr-1" />
                )}
                Envoyer Email d&apos;invitation
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled
                className="border-gray-300 text-anthracite/50 cursor-not-allowed"
                title="Bientôt — Intégration Twilio/Brevo SMS en cours"
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Envoyer SMS
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100 relative">
          <CardContent className="p-0">
            {isFetching && !isLoading && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl pointer-events-none">
                <div className="flex items-center gap-2 text-anthracite/60">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Chargement...</span>
                </div>
              </div>
            )}
            {isLoading ? (
              <div className="p-12">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 bg-gray-200 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
            ) : prospects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f7f7f7] border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={allSelectableSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = selectedCount > 0 && !allSelectableSelected;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-[#9bb49b] focus:ring-[#9bb49b]"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase">
                        Praticien
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase">
                        Ville
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase">
                        Profession
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-anthracite/70 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prospects.map((p) => (
                      <tr
                        key={p.id}
                        className={`hover:bg-[#f7f7f7] transition-colors ${
                          selectedIds.has(p.id) ? "bg-[#9bb49b]/5" : ""
                        }`}
                      >
                        <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                          {selectableIds.has(p.id) ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(p.id)}
                              onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-[#9bb49b] focus:ring-[#9bb49b]"
                            />
                          ) : (
                            <span className="inline-block w-4" />
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {p.photoUrl ? (
                              <NextImage
                                src={p.photoUrl}
                                alt={`Photo de ${p.title}`}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover bg-gray-100"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-anthracite/40" />
                              </div>
                            )}
                            <div>
                              <Link
                                href={`/praticien/${p.slug}`}
                                target="_blank"
                                className="text-sm font-medium text-[#9bb49b] hover:underline"
                              >
                                {p.title}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-sm text-anthracite/70">
                          {p.locationCity}
                        </td>
                        <td className="px-6 py-3 text-sm text-anthracite/70">
                          {p.profession?.name ?? "—"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.completionScore === 2
                                ? "bg-[#9bb49b]/10 text-[#9bb49b]"
                                : p.completionScore === 1
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-anthracite/60"
                            }`}
                          >
                            {p.completionScore === 2 ? (
                              <>
                                <Image className="h-3 w-3" />
                                <FileText className="h-3 w-3" />
                              </>
                            ) : p.completionScore === 1 ? (
                              <FileText className="h-3 w-3" />
                            ) : (
                              "—"
                            )}
                            {p.completionScore}/2
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {editingEmailId === p.id ? (
                              <div className="flex items-center gap-2 min-w-[200px]">
                                <input
                                  type="email"
                                  value={editingEmailValue}
                                  onChange={(e) => setEditingEmailValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateEmailMutation.mutate({
                                        id: p.id,
                                        contact_email: editingEmailValue,
                                      });
                                    }
                                    if (e.key === "Escape") setEditingEmailId(null);
                                  }}
                                  onBlur={() => {
                                    const v = editingEmailValue.trim();
                                    if (v !== (p.contactEmail ?? "")) {
                                      updateEmailMutation.mutate({
                                        id: p.id,
                                        contact_email: v,
                                      });
                                    } else {
                                      setEditingEmailId(null);
                                    }
                                  }}
                                  autoFocus
                                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#9bb49b]"
                                />
                                {updateEmailMutation.isPending && updateEmailMutation.variables?.id === p.id && (
                                  <Loader2 className="h-4 w-4 animate-spin text-anthracite/60" />
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 min-w-0 max-w-[220px]">
                                  <a
                                    href={p.contactEmail ? `mailto:${p.contactEmail}` : undefined}
                                    className={`shrink-0 ${p.contactEmail ? "text-[#9bb49b] hover:text-[#8aa48a]" : "text-anthracite/30"}`}
                                    title={p.contactEmail ?? "Email absent"}
                                    onClick={(e) => !p.contactEmail && e.preventDefault()}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </a>
                                  {p.contactEmail ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingEmailId(p.id);
                                        setEditingEmailValue(p.contactEmail ?? "");
                                      }}
                                      className="flex items-center gap-1 min-w-0 text-left group"
                                      title="Modifier l'email"
                                    >
                                      <span className="truncate text-sm text-anthracite">
                                        {p.contactEmail}
                                      </span>
                                      <Pencil className="h-3.5 w-3.5 shrink-0 text-anthracite/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingEmailId(p.id);
                                        setEditingEmailValue("");
                                      }}
                                      className="flex items-center gap-1 text-sm text-anthracite/40 hover:text-[#9bb49b]"
                                      title="Ajouter un email"
                                    >
                                      — <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                            <span
                              className={p.phone ? "text-[#9bb49b]" : "text-anthracite/30"}
                              title={p.phone ?? "Téléphone absent"}
                            >
                              <Phone className="h-4 w-4" />
                            </span>
                            {p.website ? (
                              <a
                                href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#9bb49b] hover:text-[#8aa48a]"
                                title="Site web"
                              >
                                <Globe className="h-4 w-4" />
                              </a>
                            ) : (
                              <span className="text-anthracite/30" title="Site absent">
                                <Globe className="h-4 w-4" />
                              </span>
                            )}
                            {p.instagramUrl ? (
                              <a
                                href={p.instagramUrl.startsWith("http") ? p.instagramUrl : `https://instagram.com/${p.instagramUrl.replace(/^@/, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#9bb49b] hover:text-[#8aa48a]"
                                title="Instagram"
                              >
                                <Instagram className="h-4 w-4" />
                              </a>
                            ) : (
                              <span className="text-anthracite/30" title="Instagram absent">
                                <Instagram className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {p.contactEmail ? (
                            p.acquisitionInvitationSentAt ? (
                              <span className="inline-flex items-center gap-1 text-sm text-[#9bb49b]">
                                <CheckCircle className="h-4 w-4" />
                                Envoyée
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => inviteMutation.mutate(p.id)}
                                disabled={inviteMutation.isPending}
                                className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                              >
                                {inviteMutation.isPending &&
                                inviteMutation.variables === p.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Mail className="h-4 w-4 mr-1" />
                                    Envoyer invitation
                                  </>
                                )}
                              </Button>
                            )
                          ) : (
                            <span className="text-sm text-anthracite/40">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <User className="h-12 w-12 text-anthracite/20 mx-auto mb-4" />
                <p className="text-lg font-medium text-anthracite mb-2">
                  Aucun prospect
                </p>
                <p className="text-anthracite/70">
                  Aucun profil shadow ne correspond aux filtres.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-anthracite/70">
              Affichage de {(pagination.page - 1) * pagination.pageSize + 1} à{" "}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} sur{" "}
              {pagination.total} prospects
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={
                          currentPage === pageNum
                            ? "bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                            : ""
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={currentPage === pagination.totalPages || isLoading}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
