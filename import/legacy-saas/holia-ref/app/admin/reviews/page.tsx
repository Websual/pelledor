"use client";

import { Card, CardContent, Button } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Trash2, Star, User, Calendar, MessageSquare, X, AlertCircle, CheckCircle, Search, ChevronLeft, ChevronRight, Flag, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  isHidden: boolean;
  needsReview?: boolean;
  isFlagged?: boolean;
  flagCount?: number;
  flagReason?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  practitioner: {
    id: string;
    title: string;
    locationCity: string;
    slug: string;
  };
  appointment: {
    id: string;
    startsAt: string;
    service: {
      id: string;
      name: string;
    };
  } | null;
}

interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminReviewsPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "visible" | "hidden" | "flagged">("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [advancedFilter, setAdvancedFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());

  // Debounce de la recherche pour éviter trop de requêtes (3 secondes après la fin de la saisie)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 3000);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: reviewsData, isLoading, isFetching } = useQuery<ReviewsResponse>({
    queryKey: ["adminReviews", statusFilter, debouncedSearchQuery, advancedFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter,
        page: currentPage.toString(),
      });
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);
      if (advancedFilter) params.append("filter", advancedFilter);
      
      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!data && data.user.role === "ADMIN",
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const reviews = reviewsData?.reviews || [];
  const pagination = reviewsData?.pagination;

  const updateReview = useMutation({
    mutationFn: async ({ id, isHidden, needsReview, ignoreReport }: { id: string; isHidden?: boolean; needsReview?: boolean; ignoreReport?: boolean }) => {
      const body: any = {};
      if (typeof isHidden === "boolean") body.isHidden = isHidden;
      if (typeof needsReview === "boolean") body.needsReview = needsReview;
      if (ignoreReport === true) body.ignoreReport = true;
      
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update review");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["adminReviews"] });
      if (selectedReview?.id === data.id) {
        setSelectedReview(data);
      }
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminReviews"] });
      setIsSlideOverOpen(false);
      setSelectedReview(null);
    },
  });

  const handleRowClick = (review: Review) => {
    setSelectedReview(review);
    setIsSlideOverOpen(true);
  };

  const handleCloseSlideOver = () => {
    setIsSlideOverOpen(false);
    setSelectedReview(null);
  };

  const handleSelectReview = (reviewId: string, checked: boolean) => {
    setSelectedReviews((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(reviewId);
      } else {
        newSet.delete(reviewId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(new Set(reviews.map((r) => r.id)));
    } else {
      setSelectedReviews(new Set());
    }
  };

  const bulkUpdateReviews = useMutation({
    mutationFn: async ({ ids, isHidden }: { ids: string[]; isHidden: boolean }) => {
      const res = await fetch(`/api/admin/reviews/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isHidden }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update reviews");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminReviews"] });
      setSelectedReviews(new Set());
    },
  });

  const handleBulkAction = (action: "show" | "hide") => {
    if (selectedReviews.size === 0) return;
    if (confirm(`Êtes-vous sûr de vouloir ${action === "show" ? "afficher" : "masquer"} ${selectedReviews.size} avis ?`)) {
      bulkUpdateReviews.mutate({
        ids: Array.from(selectedReviews),
        isHidden: action === "hide",
      });
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearchQuery, advancedFilter]);

  if (!data || data.user.role !== "ADMIN") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="h-96 bg-gray-200 rounded-3xl animate-pulse"></div>
        </div>
      </main>
    );
  }

  if (session.status === 'loading') {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="h-96 bg-gray-200 rounded-3xl animate-pulse"></div>
        </div>
      </main>
    );
  }

  const allSelected = reviews.length > 0 && selectedReviews.size === reviews.length;
  const someSelected = selectedReviews.size > 0 && selectedReviews.size < reviews.length;

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-anthracite mb-6">
            Modération des avis
          </h1>

          {/* Barre de recherche */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-anthracite/40" />
              <input
                type="text"
                placeholder="Rechercher par praticien, patient ou mots-clés..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-3xl border border-gray-200 bg-white text-anthracite placeholder:text-anthracite/40 focus:outline-none focus:ring-2 focus:ring-[#9bb49b] focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtres et actions groupées */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Filtres de statut */}
            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                size="sm"
                className={statusFilter === "all" ? "bg-[#9bb49b] hover:bg-[#8aa48a] text-white" : ""}
              >
                Tous
              </Button>
              <Button
                variant={statusFilter === "visible" ? "default" : "outline"}
                onClick={() => setStatusFilter("visible")}
                size="sm"
                className={statusFilter === "visible" ? "bg-[#9bb49b] hover:bg-[#8aa48a] text-white" : ""}
              >
                Visibles
              </Button>
              <Button
                variant={statusFilter === "hidden" ? "default" : "outline"}
                onClick={() => setStatusFilter("hidden")}
                size="sm"
                className={statusFilter === "hidden" ? "bg-[#9bb49b] hover:bg-[#8aa48a] text-white" : ""}
              >
                Masqués
              </Button>
              <Button
                variant={statusFilter === "flagged" ? "default" : "outline"}
                onClick={() => setStatusFilter("flagged")}
                size="sm"
                className={statusFilter === "flagged" ? "bg-red-600 hover:bg-red-700 text-white" : "border-red-200 text-red-600 hover:bg-red-50"}
              >
                <Flag className="h-3.5 w-3.5 mr-1" />
                Signalés
              </Button>
            </div>

            {/* Filtres avancés (Chips) */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAdvancedFilter(advancedFilter === "pending" ? "" : "pending")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  advancedFilter === "pending"
                    ? "bg-[#9bb49b] text-white"
                    : "bg-white text-anthracite border border-gray-200 hover:bg-gray-50"
                }`}
              >
                En attente
              </button>
              <button
                onClick={() => setAdvancedFilter(advancedFilter === "needsReview" ? "" : "needsReview")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  advancedFilter === "needsReview"
                    ? "bg-red-600 text-white"
                    : "bg-white text-anthracite border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                À vérifier
              </button>
              <button
                onClick={() => setAdvancedFilter(advancedFilter === "5stars" ? "" : "5stars")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  advancedFilter === "5stars"
                    ? "bg-[#9bb49b] text-white"
                    : "bg-white text-anthracite border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Star className="h-3.5 w-3.5 fill-current" />
                5 étoiles
              </button>
              <button
                onClick={() => setAdvancedFilter(advancedFilter === "verified" ? "" : "verified")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  advancedFilter === "verified"
                    ? "bg-[#9bb49b] text-white"
                    : "bg-white text-anthracite border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Avis vérifiés
              </button>
            </div>

            {/* Actions groupées */}
            {selectedReviews.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-anthracite/70">
                  {selectedReviews.size} sélectionné{selectedReviews.size > 1 ? "s" : ""}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("show")}
                  disabled={bulkUpdateReviews.isPending}
                  className="text-[#9bb49b] border-[#9bb49b] hover:bg-[#9bb49b]/10"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Afficher
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("hide")}
                  disabled={bulkUpdateReviews.isPending}
                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  Masquer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tableau de modération */}
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100 relative">
          <CardContent className="p-0">
            {isFetching && !isLoading && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl pointer-events-none">
                <div className="flex items-center gap-2 text-anthracite/60">
                  <div className="h-4 w-4 border-2 border-[#9bb49b] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Recherche en cours...</span>
                </div>
              </div>
            )}
            {isLoading ? (
              <div className="p-12">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded-2xl animate-pulse"></div>
                  ))}
                </div>
              </div>
            ) : reviews && reviews.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f7f7f7] border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someSelected;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-300 text-[#9bb49b] focus:ring-[#9bb49b]"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Note
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Praticien
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Extrait
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-anthracite/70 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reviews.map((review) => (
                      <tr
                        key={review.id}
                        onClick={() => handleRowClick(review)}
                        className={`hover:bg-[#f7f7f7] cursor-pointer transition-colors ${
                          selectedReviews.has(review.id) ? "bg-[#9bb49b]/5" : ""
                        }`}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedReviews.has(review.id)}
                            onChange={(e) => handleSelectReview(review.id, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-[#9bb49b] focus:ring-[#9bb49b]"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-anthracite/70">
                          {review.createdAt ? (
                            <time dateTime={new Date(review.createdAt).toISOString()}>
                              {format(new Date(review.createdAt), "d MMM yyyy", { locale: fr })}
                            </time>
                          ) : (
                            <span>Date inconnue</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "text-[#fbbf24] fill-[#fbbf24]"
                                    : "text-anthracite/20"
                                }`}
                              />
                            ))}
                            <span className="text-sm font-medium text-anthracite ml-1">
                              {review.rating}/5
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={review.practitioner?.slug ? `/praticien/${review.practitioner.slug}` : "#"}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-medium text-[#9bb49b] hover:text-[#8aa48a] hover:underline"
                            >
                              {review.practitioner?.title || "Praticien"}
                            </Link>
                            <Link
                              href={review.practitioner?.slug ? `/praticien/${review.practitioner.slug}` : "#"}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-anthracite/60 hover:text-[#9bb49b] transition-colors"
                              title="Voir la fiche"
                            >
                              →
                            </Link>
                          </div>
                          <p className="text-xs text-anthracite/60 mt-0.5">
                            {review.practitioner?.locationCity || "Ville"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-anthracite">
                            {review.user?.name || review.user?.email || "Anonyme"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-anthracite/70 line-clamp-2 max-w-md">
                            {review.comment || "Aucun commentaire"}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(review.flagCount ?? 0) > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                <Flag className="h-3 w-3" />
                                {review.flagCount} signalement{(review.flagCount ?? 0) > 1 ? "s" : ""}
                              </span>
                            )}
                            {review.needsReview && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                À vérifier
                              </span>
                            )}
                            {review.isHidden ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                <EyeOff className="h-3 w-3" />
                                Masqué
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-[#9bb49b]/10 text-[#9bb49b] rounded-full text-xs font-semibold flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Visible
                              </span>
                            )}
                            {!review.response && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold flex items-center gap-1" title="Sans réponse">
                                <MessageSquare className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-anthracite/20 mx-auto mb-4" />
                <p className="text-lg font-medium text-anthracite mb-2">
                  Aucun avis
                </p>
                <p className="text-anthracite/70">
                  Aucun avis {statusFilter === "visible" ? "visible" : statusFilter === "hidden" ? "masqué" : statusFilter === "flagged" ? "signalé" : ""} pour le moment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-anthracite/70">
              Affichage de {(pagination.page - 1) * pagination.pageSize + 1} à {Math.min(pagination.page * pagination.pageSize, pagination.total)} sur {pagination.total} avis
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
                      className={currentPage === pageNum ? "bg-[#9bb49b] hover:bg-[#8aa48a] text-white" : ""}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages || isLoading}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over de détail */}
      {isSlideOverOpen && selectedReview && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={handleCloseSlideOver}
          />
          {/* Slide-over Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-anthracite">Détail de l'avis</h2>
                <button
                  onClick={handleCloseSlideOver}
                  className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <X className="h-5 w-5 text-anthracite/70" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Note et statut */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-6 w-6 ${
                          i < selectedReview.rating
                            ? "text-[#fbbf24] fill-[#fbbf24]"
                            : "text-anthracite/20"
                        }`}
                      />
                    ))}
                    <span className="text-lg font-bold text-anthracite ml-2">
                      {selectedReview.rating}/5
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedReview.flagCount ?? 0) > 0 && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Flag className="h-4 w-4" />
                        {selectedReview.flagCount} signalement{(selectedReview.flagCount ?? 0) > 1 ? "s" : ""}
                      </span>
                    )}
                    {selectedReview.flagReason && (
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs" title="Raison du signalement">
                        {selectedReview.flagReason}
                      </span>
                    )}
                    {selectedReview.needsReview && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        À vérifier
                      </span>
                    )}
                    {selectedReview.isHidden ? (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold flex items-center gap-1">
                        <EyeOff className="h-4 w-4" />
                        Masqué
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-[#9bb49b]/10 text-[#9bb49b] rounded-full text-sm font-semibold flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        Visible
                      </span>
                    )}
                    {!selectedReview.response && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Sans réponse
                      </span>
                    )}
                  </div>
                </div>

                {/* Informations */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-anthracite/60 mb-1">Patient</p>
                    <p className="font-medium text-anthracite">
                      {selectedReview.user?.name || selectedReview.user?.email || "Anonyme"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-anthracite/60">Praticien</p>
                      <Link
                        href={selectedReview.practitioner?.slug ? `/praticien/${selectedReview.practitioner.slug}` : "#"}
                        className="text-xs text-[#9bb49b] hover:text-[#8aa48a] hover:underline font-medium"
                        title="Voir la fiche"
                      >
                        Voir la fiche →
                      </Link>
                    </div>
                    <Link
                      href={selectedReview.practitioner?.slug ? `/praticien/${selectedReview.practitioner.slug}` : "#"}
                      className="font-medium text-[#9bb49b] hover:text-[#8aa48a] hover:underline"
                    >
                      {selectedReview.practitioner?.title || "Praticien"}
                    </Link>
                    <p className="text-xs text-anthracite/60 mt-0.5">
                      {selectedReview.practitioner?.locationCity || "Ville"}
                    </p>
                  </div>
                  {selectedReview.createdAt && (
                    <div>
                      <p className="text-anthracite/60 mb-1">Publié le</p>
                      <time dateTime={new Date(selectedReview.createdAt).toISOString()} className="font-medium text-anthracite">
                        {format(new Date(selectedReview.createdAt), "d MMMM yyyy", { locale: fr })}
                      </time>
                    </div>
                  )}
                  {selectedReview.appointment && (
                    <div>
                      <p className="text-anthracite/60 mb-1">Rendez-vous</p>
                      {selectedReview.appointment.startsAt ? (
                        <time dateTime={new Date(selectedReview.appointment.startsAt).toISOString()} className="font-medium text-anthracite">
                          {format(new Date(selectedReview.appointment.startsAt), "d MMMM yyyy", { locale: fr })}
                        </time>
                      ) : (
                        <span className="text-anthracite/60">Date inconnue</span>
                      )}
                      {selectedReview.appointment.service && (
                        <p className="text-xs text-anthracite/60 mt-0.5">
                          {selectedReview.appointment.service.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Commentaire */}
                {selectedReview.comment && (
                  <div>
                    <h3 className="font-semibold text-anthracite mb-2">Commentaire</h3>
                    <div className="p-4 bg-[#f7f7f7] rounded-3xl">
                      <p className="text-sm text-anthracite/70 whitespace-pre-line leading-relaxed">
                        {selectedReview.comment}
                      </p>
                    </div>
                  </div>
                )}

                {/* Réponse du praticien */}
                {selectedReview.response && (
                  <div>
                    <h3 className="font-semibold text-anthracite mb-2">Réponse du praticien</h3>
                    <div className="p-4 bg-[#9bb49b]/5 rounded-3xl border-l-4 border-[#9bb49b]">
                      <p className="text-sm text-anthracite/70 whitespace-pre-line leading-relaxed">
                        {selectedReview.response}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                {(selectedReview.flagCount ?? 0) > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateReview.mutate({
                          id: selectedReview.id,
                          ignoreReport: true,
                        });
                      }}
                      disabled={updateReview.isPending}
                      className="text-[#9bb49b] border-[#9bb49b] hover:bg-[#9bb49b]/10"
                    >
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Ignorer le signalement
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (
                          confirm(
                            "Êtes-vous sûr de vouloir supprimer cet avis signalé ? Cette action est irréversible."
                          )
                        ) {
                          deleteReview.mutate(selectedReview.id);
                        }
                      }}
                      disabled={deleteReview.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Confirmer la suppression
                    </Button>
                  </>
                )}
                {selectedReview.needsReview && (
                  <Button
                    variant="default"
                    onClick={() => {
                      updateReview.mutate({
                        id: selectedReview.id,
                        needsReview: false,
                      });
                    }}
                    disabled={updateReview.isPending}
                    className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Valider l'avis
                  </Button>
                )}
                <Button
                  variant={selectedReview.isHidden ? "default" : "outline"}
                  onClick={() => {
                    updateReview.mutate({
                      id: selectedReview.id,
                      isHidden: !selectedReview.isHidden,
                    });
                  }}
                  disabled={updateReview.isPending}
                  className={selectedReview.isHidden ? "bg-[#9bb49b] hover:bg-[#8aa48a] text-white" : ""}
                >
                  {selectedReview.isHidden ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Afficher
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Masquer
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (
                      confirm(
                        "Êtes-vous sûr de vouloir supprimer cet avis ? Cette action est irréversible."
                      )
                    ) {
                      deleteReview.mutate(selectedReview.id);
                    }
                  }}
                  disabled={deleteReview.isPending}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
