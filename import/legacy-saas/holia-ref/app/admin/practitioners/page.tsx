"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, Skeleton, Input, Label } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin, Star, Calendar, Ban, X, Copy, Edit2, Save, Search, GraduationCap, Building2, Shield, Maximize2, FileText, Check, X as XIcon, Trash2, CalendarSync, CreditCard, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deletePractitioner } from "./actions";

type StripeConnectStatus = "charges_enabled" | "details_submitted" | "none";

interface Practitioner {
  id: string;
  title: string;
  bio: string;
  locationCity: string;
  photoUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  ratingAvg: number;
  createdAt: string;
  siret: string | null;
  diplomaDocumentUrl: string | null;
  diplomaVerified: boolean;
  kbisDocumentUrl: string | null;
  kbisVerified: boolean;
  rcpDocumentUrl: string | null;
  rcpVerified: boolean;
  isClaimed?: boolean;
  googleCalendarValid?: boolean;
  stripeConnectStatus?: StripeConnectStatus;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
  } | null;
  profession: {
    id: string;
    name: string;
    slug: string;
  } | null;
  services: Array<{
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
  }>;
  _count: {
    appointments: number;
    reviews: number;
  };
}

interface PractitionerDetail extends Practitioner {
  address: string | null;
  verificationDocumentUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  diplomaDocumentUrl: string | null;
  diplomaVerified: boolean;
  kbisDocumentUrl: string | null;
  kbisVerified: boolean;
  rcpDocumentUrl: string | null;
  rcpVerified: boolean;
  qualifications: Array<{
    id: string;
    title: string;
    institution: string | null;
    certificateUrl: string | null;
  }>;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminPractitionersPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "pending_siret" | "documents_to_verify">("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPractitioner, setSelectedPractitioner] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [practitionerToReject, setPractitionerToReject] = useState<string | null>(null);
  const [documentRejectionModal, setDocumentRejectionModal] = useState<{
    open: boolean;
    practitionerId: string | null;
    documentType: "diploma" | "kbis" | "rcp" | null;
    reason: string;
  }>({
    open: false,
    practitionerId: null,
    documentType: null,
    reason: "",
  });
  const [expandedDocument, setExpandedDocument] = useState<{
    url: string;
    type: string;
  } | null>(null);
  const [practitionerToDelete, setPractitionerToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce de la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Réinitialiser à la page 1 lors d'une nouvelle recherche
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Récupérer les compteurs totaux (sans pagination)
  const { data: countsData } = useQuery<{ pending: number; verified: number; total: number }>({
    queryKey: ["adminPractitionersCounts"],
    queryFn: async () => {
      const [pendingRes, verifiedRes, allRes] = await Promise.all([
        fetch(`/api/admin/practitioners?status=pending&limit=1`),
        fetch(`/api/admin/practitioners?status=verified&limit=1`),
        fetch(`/api/admin/practitioners?status=all&limit=1`),
      ]);
      const pending = await pendingRes.json();
      const verified = await verifiedRes.json();
      const all = await allRes.json();
      return {
        pending: pending.pagination?.total || 0,
        verified: verified.pagination?.total || 0,
        total: all.pagination?.total || 0,
      };
    },
    enabled: !!data && data.user.role === "ADMIN",
  });

  // Récupérer les praticiens avec pagination et recherche
  const { data: practitionersData, isLoading } = useQuery<{
    practitioners: Practitioner[];
    pagination: PaginationInfo;
  }>({
    queryKey: ["adminPractitioners", statusFilter, currentPage, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter,
        page: currentPage.toString(),
        limit: "25",
      });
      if (debouncedSearch.trim()) {
        params.append("search", debouncedSearch.trim());
      }
      const res = await fetch(`/api/admin/practitioners?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch practitioners");
      return res.json();
    },
    enabled: !!data && data.user.role === "ADMIN",
  });

  // Récupérer les détails d'un praticien sélectionné
  const { data: practitionerDetail, isLoading: isLoadingDetail } = useQuery<PractitionerDetail>({
    queryKey: ["adminPractitionerDetail", selectedPractitioner],
    queryFn: async () => {
      if (!selectedPractitioner) return null;
      const res = await fetch(`/api/admin/practitioners/${selectedPractitioner}`);
      if (!res.ok) throw new Error("Failed to fetch practitioner details");
      return res.json();
    },
    enabled: !!selectedPractitioner && !!data && data.user.role === "ADMIN",
  });

  const verifyPractitioner = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/practitioners/${id}/verify`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to verify practitioner");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPractitioners"] });
      queryClient.invalidateQueries({ queryKey: ["adminPractitionersCounts"] });
      queryClient.invalidateQueries({ queryKey: ["adminPractitionerDetail"] });
      setSelectedPractitioner(null);
    },
  });

  const rejectPractitioner = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/admin/practitioners/${id}/verify`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject practitioner");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPractitioners"] });
      queryClient.invalidateQueries({ queryKey: ["adminPractitionersCounts"] });
      setShowRejectionModal(false);
      setRejectionReason("");
      setPractitionerToReject(null);
      setSelectedPractitioner(null);
    },
  });

  const updatePractitioner = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/practitioners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update practitioner");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPractitioners"] });
      queryClient.invalidateQueries({ queryKey: ["adminPractitionerDetail"] });
    },
  });

  const suspendPractitioner = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/practitioners/${id}/suspend`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to suspend practitioner");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPractitioners"] });
      queryClient.invalidateQueries({ queryKey: ["adminPractitionerDetail"] });
    },
  });

  const activatePractitioner = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/practitioners/${id}/activate`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to activate practitioner");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPractitioners"] });
      queryClient.invalidateQueries({ queryKey: ["adminPractitionerDetail"] });
    },
  });

  const updateDocumentStatus = useMutation({
    mutationFn: async ({
      practitionerId,
      type,
      action,
      reason,
    }: {
      practitionerId: string;
      type: "diploma" | "kbis" | "rcp";
      action: "approve" | "reject";
      reason?: string;
    }) => {
      const res = await fetch(`/api/admin/practitioners/${practitionerId}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, action, reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update document status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPractitioners"] });
      queryClient.invalidateQueries({ queryKey: ["adminPractitionerDetail"] });
      setDocumentRejectionModal({
        open: false,
        practitionerId: null,
        documentType: null,
        reason: "",
      });
    },
  });

  // Réinitialiser la page quand on change de filtre ou de recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch]);

  // Gérer la redirection si l'utilisateur n'est pas admin
  useEffect(() => {
    if (data && data.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [data, router]);

  if (!data || data.user.role !== "ADMIN") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <Skeleton className="w-64 h-8 bg-gray-200" />
      </div>
    );
  }

  if (session.status === 'loading') return <Skeleton className="bg-gray-200" />;

  const practitioners = practitionersData?.practitioners || [];
  const pagination = practitionersData?.pagination;

  const handleRejectClick = (id: string) => {
    setPractitionerToReject(id);
    setShowRejectionModal(true);
  };

  const handleRejectConfirm = () => {
    if (practitionerToReject) {
      rejectPractitioner.mutate({
        id: practitionerToReject,
        reason: rejectionReason.trim() || undefined,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-anthracite mb-6">
            Validation des praticiens
          </h1>
          
          {/* Barre de recherche */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-anthracite/40" />
              <Input
                type="text"
                placeholder="Rechercher par nom, email ou SIRET..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full max-w-md"
              />
            </div>
          </div>

          {/* Filtres */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
            >
              En attente ({countsData?.pending || 0})
            </Button>
            <Button
              variant={statusFilter === "pending_siret" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending_siret")}
            >
              En attente SIRET
            </Button>
            <Button
              variant={statusFilter === "documents_to_verify" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("documents_to_verify")}
            >
              Documents à vérifier
            </Button>
            <Button
              variant={statusFilter === "verified" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("verified")}
            >
              Validés ({countsData?.verified || 0})
            </Button>
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Tous ({countsData?.total || 0})
            </Button>
          </div>
        </div>

        {/* Tableau des praticiens */}
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardContent className="p-0">
            {practitioners.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Ville
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        SIRET
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Badges
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider w-28">
                        Intégrations
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Date d'inscription
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-anthracite/70 uppercase tracking-wider w-40 sticky right-0 bg-gray-50 border-l border-gray-100 shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sable">
                    {practitioners.map((practitioner) => (
                      <tr
                        key={practitioner.id}
                        onClick={() => setSelectedPractitioner(practitioner.id)}
                        className="group hover:bg-sauge/5 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {practitioner.photoUrl ? (
                              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                  src={practitioner.photoUrl}
                                  alt={practitioner.title}
                                  width={32}
                                  height={32}
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-sable flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-anthracite/40" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-anthracite truncate">{practitioner.title}</p>
                              <p className="text-xs text-anthracite/60 truncate">
                                {practitioner.user?.email || "Pas d'email"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-anthracite">
                          {practitioner.locationCity}
                        </td>
                        <td className="px-4 py-3">
                          {practitioner.siret ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-anthracite">{practitioner.siret}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(practitioner.siret!);
                                }}
                                className="text-anthracite/60 hover:text-anthracite"
                                title="Copier le SIRET"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-anthracite/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {practitioner.siret && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                SIRET
                              </span>
                            )}
                            {practitioner.diplomaDocumentUrl && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                                practitioner.diplomaVerified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                <GraduationCap className="h-3 w-3" />
                                Diplôme
                              </span>
                            )}
                            {practitioner.kbisDocumentUrl && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                                practitioner.kbisVerified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                <Building2 className="h-3 w-3" />
                                Kbis
                              </span>
                            )}
                            {practitioner.rcpDocumentUrl && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                                practitioner.rcpVerified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                <Shield className="h-3 w-3" />
                                RC Pro
                              </span>
                            )}
                            {!practitioner.siret && !practitioner.diplomaDocumentUrl && !practitioner.kbisDocumentUrl && !practitioner.rcpDocumentUrl && (
                              <span className="text-xs text-anthracite/40">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span title={practitioner.googleCalendarValid ? "Google Calendar : token OAuth valide" : "Google Calendar : token invalide ou absent"} className="inline-flex items-center gap-0.5">
                              <CalendarSync className={`h-4 w-4 ${practitioner.googleCalendarValid ? "text-green-600" : "text-red-500"}`} />
                              <span className="text-[10px] text-anthracite/60 hidden sm:inline">Google</span>
                            </span>
                            <span title={practitioner.stripeConnectStatus === "charges_enabled" ? "Stripe Connect : charges activées" : practitioner.stripeConnectStatus === "details_submitted" ? "Stripe Connect : détails envoyés, en attente" : "Stripe Connect : non configuré"} className="inline-flex items-center gap-0.5">
                              <CreditCard className={`h-4 w-4 ${
                                practitioner.stripeConnectStatus === "charges_enabled" ? "text-green-600" :
                                practitioner.stripeConnectStatus === "details_submitted" ? "text-amber-500" : "text-red-500"
                              }`} />
                              <span className="text-[10px] text-anthracite/60 hidden sm:inline">Stripe</span>
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${practitioner.isClaimed ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`} title={practitioner.isClaimed ? "Compte inscrit ou réclamé" : "Shadow Profile (scrapé)"}>
                              {practitioner.isClaimed ? "Compte réel" : "Shadow"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-anthracite/70">
                          {format(new Date(practitioner.createdAt), "d MMM yyyy", { locale: fr })}
                        </td>
                        <td className="px-4 py-3">
                          {practitioner.isVerified ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Validé
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                              <Clock className="h-3 w-3" />
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-sauge/5 border-l border-gray-100 shadow-[-4px_0_8px_rgba(0,0,0,0.04)]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-sauge/30 text-sauge hover:bg-sauge/10 gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/pro/dashboard?viewAs=${practitioner.id}`);
                              }}
                              title="Voir le dashboard comme ce praticien"
                            >
                              <Eye className="h-4 w-4 shrink-0" />
                              <span className="hidden sm:inline">Simuler</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-1.5"
                              onClick={() => setPractitionerToDelete(practitioner.id)}
                              disabled={isDeleting}
                              title="Supprimer le praticien"
                            >
                              <Trash2 className="h-4 w-4 shrink-0" />
                              <span className="hidden sm:inline">Supprimer</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-anthracite/70">
                  {debouncedSearch.trim()
                    ? "Aucun praticien trouvé pour cette recherche."
                    : `Aucun praticien ${statusFilter === "pending" ? "en attente" : statusFilter === "verified" ? "validé" : statusFilter === "pending_siret" ? "en attente de SIRET" : statusFilter === "documents_to_verify" ? "avec documents à vérifier" : ""} pour le moment.`}
                </p>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <div className="text-sm text-anthracite/70">
                  Page {pagination.page} sur {pagination.totalPages} ({pagination.total} praticiens)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Précédent
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
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
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slide-over pour les détails */}
      {selectedPractitioner && (
        <PractitionerDetailSlideOver
          practitioner={practitionerDetail}
          isLoading={isLoadingDetail}
          onClose={() => setSelectedPractitioner(null)}
          onVerify={(id) => verifyPractitioner.mutate(id)}
          onReject={handleRejectClick}
          onUpdate={(id, data) => updatePractitioner.mutate({ id, data })}
          onSuspend={(id) => suspendPractitioner.mutate(id)}
          onActivate={(id) => activatePractitioner.mutate(id)}
          onDocumentAction={(practitionerId, type, action, reason) =>
            updateDocumentStatus.mutate({ practitionerId, type, action, reason })
          }
          isVerifying={verifyPractitioner.isPending}
          isRejecting={rejectPractitioner.isPending}
          isUpdating={updatePractitioner.isPending}
          isUpdatingDocument={updateDocumentStatus.isPending}
          onOpenDocument={(url, type) => setExpandedDocument({ url, type })}
          onOpenRejectionModal={(practitionerId, documentType) =>
            setDocumentRejectionModal({
              open: true,
              practitionerId,
              documentType,
              reason: "",
            })
          }
        />
      )}

      {/* Modal d'agrandissement de document */}
      {expandedDocument && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setExpandedDocument(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            {expandedDocument.url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
              <Image
                src={expandedDocument.url}
                alt={expandedDocument.type}
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain rounded-2xl"
              />
            ) : (
              <iframe
                src={expandedDocument.url}
                className="w-full h-full rounded-2xl border border-white/20"
                title={expandedDocument.type}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal de refus de document */}
      {documentRejectionModal.open && documentRejectionModal.practitionerId && documentRejectionModal.documentType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle>Refuser le document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Motif du refus</Label>
                <Input
                  id="rejection-reason"
                  placeholder="Ex: Document illisible, document expiré..."
                  value={documentRejectionModal.reason}
                  onChange={(e) =>
                    setDocumentRejectionModal({
                      ...documentRejectionModal,
                      reason: e.target.value,
                    })
                  }
                  className="mt-2"
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    setDocumentRejectionModal({
                      open: false,
                      practitionerId: null,
                      documentType: null,
                      reason: "",
                    })
                  }
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    if (documentRejectionModal.reason.trim()) {
                      updateDocumentStatus.mutate({
                        practitionerId: documentRejectionModal.practitionerId!,
                        type: documentRejectionModal.documentType!,
                        action: "reject",
                        reason: documentRejectionModal.reason.trim(),
                      });
                    }
                  }}
                  disabled={!documentRejectionModal.reason.trim() || updateDocumentStatus.isPending}
                >
                  {updateDocumentStatus.isPending ? "Rejet en cours..." : "Rejeter"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de confirmation suppression */}
      <ConfirmDialog
        open={practitionerToDelete !== null}
        title="Supprimer le praticien"
        message="Êtes-vous sûr de vouloir supprimer définitivement ce praticien ? Les fichiers associés (photo, galerie, documents) seront supprimés du serveur et l'entrée en base de données sera effacée. Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        onConfirm={async () => {
          if (!practitionerToDelete) return;
          setIsDeleting(true);
          try {
            const result = await deletePractitioner(practitionerToDelete);
            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ["adminPractitioners"] });
              queryClient.invalidateQueries({ queryKey: ["adminPractitionersCounts"] });
              queryClient.invalidateQueries({ queryKey: ["adminPractitionerDetail"] });
              setSelectedPractitioner(null);
              setPractitionerToDelete(null);
            } else {
              alert(result.error || "Erreur lors de la suppression");
            }
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setPractitionerToDelete(null)}
      />

      {/* Modal de rejet */}
      {showRejectionModal && (
        <RejectionModal
          onClose={() => {
            setShowRejectionModal(false);
            setRejectionReason("");
            setPractitionerToReject(null);
          }}
          onConfirm={handleRejectConfirm}
          reason={rejectionReason}
          onReasonChange={setRejectionReason}
          isPending={rejectPractitioner.isPending}
        />
      )}
    </div>
  );
}

// Composant Slide-over pour les détails
function PractitionerDetailSlideOver({
  practitioner,
  isLoading,
  onClose,
  onVerify,
  onReject,
  onUpdate,
  onSuspend,
  onActivate,
  onDocumentAction,
  onOpenDocument,
  onOpenRejectionModal,
  isVerifying,
  isRejecting,
  isUpdating,
  isUpdatingDocument,
}: {
  practitioner: PractitionerDetail | null | undefined;
  isLoading: boolean;
  onClose: () => void;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onDocumentAction: (practitionerId: string, type: "diploma" | "kbis" | "rcp", action: "approve" | "reject", reason?: string) => void;
  onOpenDocument: (url: string, type: string) => void;
  onOpenRejectionModal: (practitionerId: string, documentType: "diploma" | "kbis" | "rcp") => void;
  isVerifying: boolean;
  isRejecting: boolean;
  isUpdating: boolean;
  isUpdatingDocument: boolean;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="ml-auto w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
          <div className="p-8">
            <Skeleton className="w-full h-8 mb-4 bg-gray-200" />
            <Skeleton className="w-full h-32 bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!practitioner) return null;

  const handleEdit = (field: string, currentValue: string | null) => {
    setEditingField(field);
    setEditValues({ [field]: currentValue || "" });
  };

  const handleSave = (field: string) => {
    if (editValues[field] !== undefined) {
      onUpdate(practitioner.id, { [field]: editValues[field] || null });
      setEditingField(null);
      setEditValues({});
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValues({});
  };

  const EditableField = ({ field, label, value, type = "text" }: { field: string; label: string; value: string | null; type?: string }) => {
    const isEditing = editingField === field;
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-anthracite/70">{label}</Label>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type={type}
              value={editValues[field] || ""}
              onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
              className="flex-1"
              autoFocus
            />
            <Button size="sm" onClick={() => handleSave(field)} disabled={isUpdating}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-3xl">
            <span className="text-anthracite">{value || "Non renseigné"}</span>
            <Button size="sm" variant="ghost" onClick={() => handleEdit(field, value)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-white shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-anthracite">Détails du praticien</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Photo et statut */}
          <div className="flex items-start gap-6">
            {practitioner.photoUrl ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={practitioner.photoUrl}
                  alt={practitioner.title}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-sable flex items-center justify-center flex-shrink-0">
                <User className="h-12 w-12 text-anthracite/40" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-anthracite mb-2">{practitioner.title}</h3>
              {practitioner.profession && (
                <p className="text-sm text-anthracite/70 mb-2">{practitioner.profession.name}</p>
              )}
              <div className="flex items-center gap-2">
                {practitioner.isVerified ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Validé
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    En attente
                  </span>
                )}
                {!practitioner.isActive && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Ban className="h-4 w-4" />
                    Suspendu
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SIRET - Bien visible pour copier-coller */}
          {practitioner.siret && (
            <Card className="bg-yellow-50 border-yellow-200 rounded-3xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-anthracite/70 mb-1 block">Numéro SIRET</Label>
                    <p className="font-mono text-lg font-bold text-anthracite">{practitioner.siret}</p>
                    <p className="text-xs text-anthracite/60 mt-1">
                      Cliquez pour copier et vérifier sur{" "}
                      <a
                        href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${practitioner.siret}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sauge hover:underline"
                      >
                        annuaire-entreprises.data.gouv.fr
                      </a>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(practitioner.siret!)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informations éditables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableField field="title" label="Titre" value={practitioner.title} />
            <EditableField field="firstName" label="Prénom" value={practitioner.firstName} />
            <EditableField field="lastName" label="Nom" value={practitioner.lastName} />
            <EditableField field="phone" label="Téléphone" value={practitioner.phone} type="tel" />
            <EditableField field="address" label="Adresse" value={practitioner.address} />
            <EditableField field="locationCity" label="Ville" value={practitioner.locationCity} />
            <EditableField field="siret" label="SIRET" value={practitioner.siret} />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-anthracite/70">Bio</Label>
            {editingField === "bio" ? (
              <div className="space-y-2">
                <textarea
                  value={editValues.bio || ""}
                  onChange={(e) => setEditValues({ ...editValues, bio: e.target.value })}
                  className="w-full min-h-[120px] rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleSave("bio")} disabled={isUpdating}>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between p-3 bg-gray-50 rounded-3xl">
                <p className="text-anthracite whitespace-pre-line flex-1">{practitioner.bio || "Non renseigné"}</p>
                <Button size="sm" variant="ghost" onClick={() => handleEdit("bio", practitioner.bio)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-anthracite">Contact</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-anthracite/70">
                <Mail className="h-4 w-4" />
                <span>{practitioner.user?.email || "Pas d'email"}</span>
              </div>
              {practitioner.user?.phone && (
                <div className="flex items-center gap-2 text-anthracite/70">
                  <Phone className="h-4 w-4" />
                  <span>{practitioner.user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-anthracite/70">
                <MapPin className="h-4 w-4" />
                <span>{practitioner.locationCity}</span>
              </div>
              <div className="flex items-center gap-2 text-anthracite/70">
                <Calendar className="h-4 w-4" />
                <span>
                  Inscrit le {format(new Date(practitioner.createdAt), "d MMMM yyyy", { locale: fr })}
                </span>
              </div>
            </div>
          </div>

          {/* Documents de vérification */}
          <div className="space-y-4">
            <h3 className="font-semibold text-anthracite">Documents de vérification</h3>
            
            {/* Diplôme */}
            {practitioner.diplomaDocumentUrl && (
              <Card className="border-2 border-gray-100 rounded-3xl shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-anthracite" />
                      <div>
                        <Label className="text-sm font-medium text-anthracite">Diplôme ou Certification</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {practitioner.diplomaVerified ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Validé
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              En attente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenDocument(practitioner.diplomaDocumentUrl!, "Diplôme")}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {practitioner.diplomaDocumentUrl.match(/\.(jpg|jpeg|png|webp)$/i) && (
                    <div className="mb-3 cursor-pointer" onClick={() => onOpenDocument(practitioner.diplomaDocumentUrl!, "Diplôme")}>
                      <Image
                        src={practitioner.diplomaDocumentUrl}
                        alt="Diplôme"
                        width={400}
                        height={300}
                        className="rounded-3xl border border-gray-100 max-w-full hover:opacity-80 transition-opacity"
                      />
                    </div>
                  )}
                  {!practitioner.diplomaDocumentUrl.match(/\.(jpg|jpeg|png|webp)$/i) && (
                    <div className="mb-3">
                      <a
                        href={practitioner.diplomaDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sauge hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Ouvrir le document</span>
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenRejectionModal(practitioner.id, "diploma")}
                      disabled={isUpdatingDocument || practitioner.diplomaVerified}
                    >
                      <XIcon className="h-4 w-4 mr-2" />
                      Refuser
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => onDocumentAction(practitioner.id, "diploma", "approve")}
                      disabled={isUpdatingDocument || practitioner.diplomaVerified}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Kbis */}
            {practitioner.kbisDocumentUrl && (
              <Card className="border-2 border-gray-100 rounded-3xl shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-anthracite" />
                      <div>
                        <Label className="text-sm font-medium text-anthracite">Extrait Kbis ou Avis de situation INSEE</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {practitioner.kbisVerified ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Validé
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              En attente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenDocument(practitioner.kbisDocumentUrl!, "Kbis")}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {practitioner.kbisDocumentUrl.match(/\.(jpg|jpeg|png|webp)$/i) && (
                    <div className="mb-3 cursor-pointer" onClick={() => onOpenDocument(practitioner.kbisDocumentUrl!, "Kbis")}>
                      <Image
                        src={practitioner.kbisDocumentUrl}
                        alt="Kbis"
                        width={400}
                        height={300}
                        className="rounded-3xl border border-gray-100 max-w-full hover:opacity-80 transition-opacity"
                      />
                    </div>
                  )}
                  {!practitioner.kbisDocumentUrl.match(/\.(jpg|jpeg|png|webp)$/i) && (
                    <div className="mb-3">
                      <a
                        href={practitioner.kbisDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sauge hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Ouvrir le document</span>
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenRejectionModal(practitioner.id, "kbis")}
                      disabled={isUpdatingDocument || practitioner.kbisVerified}
                    >
                      <XIcon className="h-4 w-4 mr-2" />
                      Refuser
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => onDocumentAction(practitioner.id, "kbis", "approve")}
                      disabled={isUpdatingDocument || practitioner.kbisVerified}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* RC Pro */}
            {practitioner.rcpDocumentUrl && (
              <Card className="border-2 border-gray-100 rounded-3xl shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-anthracite" />
                      <div>
                        <Label className="text-sm font-medium text-anthracite">Attestation d'assurance RC Pro</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {practitioner.rcpVerified ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Validé
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              En attente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenDocument(practitioner.rcpDocumentUrl!, "RC Pro")}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {practitioner.rcpDocumentUrl.match(/\.(jpg|jpeg|png|webp)$/i) && (
                    <div className="mb-3 cursor-pointer" onClick={() => onOpenDocument(practitioner.rcpDocumentUrl!, "RC Pro")}>
                      <Image
                        src={practitioner.rcpDocumentUrl}
                        alt="RC Pro"
                        width={400}
                        height={300}
                        className="rounded-3xl border border-gray-100 max-w-full hover:opacity-80 transition-opacity"
                      />
                    </div>
                  )}
                  {!practitioner.rcpDocumentUrl.match(/\.(jpg|jpeg|png|webp)$/i) && (
                    <div className="mb-3">
                      <a
                        href={practitioner.rcpDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sauge hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Ouvrir le document</span>
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenRejectionModal(practitioner.id, "rcp")}
                      disabled={isUpdatingDocument || practitioner.rcpVerified}
                    >
                      <XIcon className="h-4 w-4 mr-2" />
                      Refuser
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => onDocumentAction(practitioner.id, "rcp", "approve")}
                      disabled={isUpdatingDocument || practitioner.rcpVerified}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Message si aucun document */}
            {!practitioner.diplomaDocumentUrl && !practitioner.kbisDocumentUrl && !practitioner.rcpDocumentUrl && (
              <div className="text-center py-8 text-anthracite/60">
                <p>Aucun document uploadé</p>
              </div>
            )}
          </div>

          {/* Services */}
          {practitioner.services.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-anthracite">Services ({practitioner.services.length})</h3>
              <div className="space-y-2">
                {practitioner.services.map((service) => (
                  <div key={service.id} className="p-3 bg-gray-50 rounded-3xl">
                    <div className="font-medium text-anthracite">{service.name}</div>
                    <div className="text-sm text-anthracite/70">
                      {service.durationMin} min - {(service.priceCents / 100).toFixed(2)}€
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistiques */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-3xl shadow-sm border border-gray-100">
              <div className="text-sm text-anthracite/70 mb-1">Rendez-vous</div>
              <div className="text-2xl font-bold text-anthracite">{practitioner._count.appointments}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-3xl shadow-sm border border-gray-100">
              <div className="text-sm text-anthracite/70 mb-1">Avis</div>
              <div className="text-2xl font-bold text-anthracite">{practitioner._count.reviews}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-white border-t border-sable pt-6 mt-6 space-y-4">
            {!practitioner.isVerified ? (
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onVerify(practitioner.id)}
                  disabled={isVerifying}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {isVerifying ? "Validation en cours..." : "Valider le profil"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => onReject(practitioner.id)}
                  disabled={isRejecting}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Rejeter
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                {practitioner.isActive ? (
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => onSuspend(practitioner.id)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Suspendre
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-sauge hover:bg-sauge-dark text-white"
                    onClick={() => onActivate(practitioner.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Réactiver
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Modal de rejet avec champ raison
function RejectionModal({
  onClose,
  onConfirm,
  reason,
  onReasonChange,
  isPending,
}: {
  onClose: () => void;
  onConfirm: () => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-anthracite">Rejeter le profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="rejection-reason" className="text-sm font-medium text-anthracite/70 mb-2 block">
              Raison du rejet (optionnelle)
            </Label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Expliquez la raison du rejet. Ce message sera envoyé par email au praticien."
              className="w-full min-h-[120px] rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm"
            />
            <p className="text-xs text-anthracite/60 mt-1">
              Cette raison sera envoyée par email au praticien pour l&apos;aider à corriger son profil.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? "Rejet en cours..." : "Rejeter"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
