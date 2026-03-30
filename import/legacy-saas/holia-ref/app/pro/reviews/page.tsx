"use client";

import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, Heart, Shield, Filter, TrendingUp } from "lucide-react";
import { ReportReviewButton } from "@/components/report-review-button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useMemo } from "react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  created_at: string;
  appointment_id: string | null;
  users: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  appointments: {
    id: string;
    starts_at: string;
    services: {
      id: string;
      name: string;
    };
  } | null;
}

interface ReviewStats {
  averageRating: number;
  reviewsCount: number;
  favoritesCount: number;
}

export default function ProReviewsPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [filterUnanswered, setFilterUnanswered] = useState(false);

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<ReviewStats>({
    queryKey: ["practitionerReviewStats"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/reviews/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  // Fetch reviews
  const { data: reviews, isLoading: isLoadingReviews } = useQuery<Review[]>({
    queryKey: ["practitionerReviews"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/reviews");
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  const updateResponse = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const res = await fetch(`/api/reviews/${id}/response`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update response");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerReviews"] });
      setEditingReviewId(null);
      setResponseText({});
    },
  });

  const deleteResponse = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reviews/${id}/response`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete response");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerReviews"] });
    },
  });

  // Calculer les mots-clés les plus fréquents dans les commentaires
  const keywords = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    
    const wordCount: Record<string, number> = {};
    const stopWords = new Set([
      "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "à", "pour", "avec", "sans",
      "sur", "dans", "par", "est", "sont", "était", "étaient", "être", "avoir", "a", "as", "ont",
      "je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "me", "te", "se", "nous", "vous",
      "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre", "votre", "leur",
      "ce", "cet", "cette", "ces", "qui", "que", "quoi", "dont", "où", "quand", "comment",
      "très", "plus", "moins", "bien", "mal", "beaucoup", "peu", "trop", "assez",
      "mais", "donc", "car", "puisque", "parce", "que", "si", "alors", "mais", "cependant",
      "je", "j", "ai", "suis", "fait", "faites", "fait", "faire", "fait", "faites"
    ]);

    reviews.forEach((review) => {
      if (review.comment) {
        const words = review.comment
          .toLowerCase()
          .replace(/[^\w\sàâäéèêëïîôöùûüÿç]/g, " ")
          .split(/\s+/)
          .filter((word) => word.length > 3 && !stopWords.has(word));
        
        words.forEach((word) => {
          wordCount[word] = (wordCount[word] || 0) + 1;
        });
      }
    });

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([word, count]) => ({ word, count }));
  }, [reviews]);

  // Filtrer les avis selon le filtre actif
  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    if (filterUnanswered) {
      return reviews.filter((review) => !review.response);
    }
    return reviews;
  }, [reviews, filterUnanswered]);

  // Calculer le pourcentage de satisfaction (basé sur la moyenne / 5)
  const satisfactionPercentage = useMemo(() => {
    if (!stats || stats.averageRating === 0) return 0;
    return Math.round((stats.averageRating / 5) * 100);
  }, [stats]);

  if (session.status === 'loading') return <Skeleton />

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  const handleEdit = (review: Review) => {
    setEditingReviewId(review.id);
    setResponseText({ ...responseText, [review.id]: review.response || "" });
  };

  const handleCancel = (reviewId: string) => {
    setEditingReviewId(null);
    setResponseText({ ...responseText, [reviewId]: "" });
  };

  const handleSubmit = (reviewId: string) => {
    const text = responseText[reviewId] || "";
    if (!text.trim()) {
      return;
    }
    updateResponse.mutate({ id: reviewId, response: text });
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        <h1 className="text-3xl font-bold font-heading text-anthracite mb-8">
          Avis & Réputation
        </h1>

        {/* Barre de satisfaction globale */}
        {stats && stats.reviewsCount > 0 && (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-3xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-[#9bb49b]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-anthracite mb-1">
                    Satisfaction globale
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#9bb49b] to-[#8aa48a] transition-all duration-500"
                        style={{ width: `${satisfactionPercentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-anthracite min-w-[3rem] text-right">
                      {satisfactionPercentage}%
                    </span>
                  </div>
                  <p className="text-xs text-anthracite/60 mt-2">
                    Basé sur {stats.reviewsCount} avis • Note moyenne : {stats.averageRating.toFixed(1)}/5
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nuage de mots-clés */}
        {keywords.length > 0 && (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-anthracite mb-4">
                Mots-clés récurrents
              </h2>
              <div className="flex flex-wrap gap-2">
                {keywords.map(({ word, count }) => {
                  const intensity = Math.min(count / keywords[0].count, 1);
                  const fontSize = intensity > 0.7 ? "text-base" : intensity > 0.4 ? "text-sm" : "text-xs";
                  const opacity = intensity > 0.7 ? "opacity-100" : intensity > 0.4 ? "opacity-80" : "opacity-60";
                  return (
                    <span
                      key={word}
                      className={`px-3 py-1.5 bg-[#9bb49b]/10 text-[#9bb49b] rounded-full font-medium ${fontSize} ${opacity} border border-[#9bb49b]/20`}
                    >
                      {word.charAt(0).toUpperCase() + word.slice(1)} ({count})
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtre et Stats Cards */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-anthracite">Vos avis</h2>
          <Button
            variant={filterUnanswered ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterUnanswered(!filterUnanswered)}
            className={filterUnanswered ? "bg-[#9bb49b] hover:bg-[#8aa48a] text-white" : ""}
          >
            <Filter className="h-4 w-4 mr-2" />
            {filterUnanswered ? "Tous les avis" : "Sans réponse"}
            {filterUnanswered && reviews && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {reviews.filter((r) => !r.response).length}
              </span>
            )}
          </Button>
        </div>

        {isLoadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Note moyenne */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-3xl flex items-center justify-center">
                    <Star className="h-6 w-6 text-[#9bb49b]" />
                  </div>
                  <div>
                    <p className="text-sm text-anthracite/60">Note moyenne</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.round(stats.averageRating)
                                ? "text-[#fbbf24] fill-[#fbbf24]"
                                : "text-anthracite/20"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-2xl font-bold text-anthracite">
                        {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "0.0"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nombre total d'avis */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-3xl flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-[#9bb49b]" />
                  </div>
                  <div>
                    <p className="text-sm text-anthracite/60">Total d'avis</p>
                    <p className="text-3xl font-bold text-anthracite mt-1">
                      {stats.reviewsCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nombre de favoris */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-3xl flex items-center justify-center">
                    <Heart className="h-6 w-6 text-[#9bb49b]" />
                  </div>
                  <div>
                    <p className="text-sm text-anthracite/60">Favoris</p>
                    <p className="text-3xl font-bold text-anthracite mt-1">
                      {stats.favoritesCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Reviews List */}
        {isLoadingReviews ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-3xl" />
            ))}
          </div>
        ) : filteredReviews && filteredReviews.length > 0 ? (
          <div className="space-y-6">
            {filteredReviews.map((review) => (
              <Card key={review.id} className="bg-white rounded-3xl shadow-sm border border-gray-100">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-5 w-5 ${
                                i < review.rating
                                  ? "text-[#fbbf24] fill-[#fbbf24]"
                                  : "text-anthracite/20"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-semibold text-anthracite">
                          {review.users?.name || review.users?.email || "Anonyme"}
                        </span>
                        {review.appointment_id && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-[#9bb49b]/10 rounded-2xl">
                            <Shield className="h-3.5 w-3.5 text-[#9bb49b]" />
                            <span className="text-xs font-medium text-[#9bb49b]">
                              Avis vérifié
                            </span>
                          </div>
                        )}
                      </div>
                      {review.appointments && (
                        <div className="flex items-center gap-4 text-sm text-anthracite/60 mb-2">
                          <span>{review.appointments.services?.name || "Service"}</span>
                          <span>•</span>
                          <time dateTime={new Date(review.appointments.starts_at).toISOString()}>
                            {format(new Date(review.appointments.starts_at), "d MMMM yyyy", {
                              locale: fr,
                            })}
                          </time>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <ReportReviewButton reviewId={review.id} variant="pro" />
                      <span className="text-sm text-anthracite/60">
                        <time dateTime={new Date(review.created_at).toISOString()}>
                          {format(new Date(review.created_at), "d MMMM yyyy", { locale: fr })}
                        </time>
                      </span>
                    </div>
                  </div>

                  {review.comment && (
                    <p className="text-anthracite/70 leading-relaxed mb-4">
                      {review.comment}
                    </p>
                  )}

                  {/* Réponse existante */}
                  {review.response && editingReviewId !== review.id && (
                    <div className="mt-4 p-4 bg-white rounded-3xl shadow-sm border border-gray-100 border-l-4 border-l-[#9bb49b]">
                      <p className="text-xs font-semibold text-[#9bb49b] mb-2">Votre réponse</p>
                      <p className="text-sm text-anthracite/70 whitespace-pre-line mb-3">
                        {review.response}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(review)}
                        className="text-[#9bb49b] border-[#9bb49b] hover:bg-[#9bb49b]/10"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Modifier la réponse
                      </Button>
                    </div>
                  )}

                  {/* Formulaire de réponse */}
                  {editingReviewId === review.id ? (
                    <div className="mt-4 p-4 bg-white rounded-3xl shadow-sm border border-gray-100">
                      <label className="text-sm font-medium text-anthracite mb-2 block">
                        Votre réponse
                      </label>
                      <textarea
                        value={responseText[review.id] || ""}
                        onChange={(e) =>
                          setResponseText({ ...responseText, [review.id]: e.target.value })
                        }
                        placeholder="Répondez à cet avis..."
                        rows={4}
                        className="mt-2 flex min-h-[100px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm ring-offset-white placeholder:text-anthracite/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bb49b] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={updateResponse.isPending}
                      />
                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleSubmit(review.id)}
                          disabled={updateResponse.isPending || !responseText[review.id]?.trim()}
                          className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                        >
                          {updateResponse.isPending ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(review.id)}
                          disabled={updateResponse.isPending}
                        >
                          Annuler
                        </Button>
                        {review.response && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (
                                confirm(
                                  "Êtes-vous sûr de vouloir supprimer cette réponse ?"
                                )
                              ) {
                                deleteResponse.mutate(review.id);
                              }
                            }}
                            disabled={deleteResponse.isPending}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                      {updateResponse.isError && (
                        <p className="text-red-600 text-sm mt-2">
                          {updateResponse.error instanceof Error
                            ? updateResponse.error.message
                            : "Une erreur est survenue"}
                        </p>
                      )}
                    </div>
                  ) : !review.response ? (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(review)}
                        className="text-[#9bb49b] border-[#9bb49b] hover:bg-[#9bb49b]/10"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Répondre
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filterUnanswered ? (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardContent className="py-12">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-anthracite/20 mx-auto mb-4" />
                <p className="text-lg font-medium text-anthracite mb-2">
                  Tous les avis ont une réponse
                </p>
                <p className="text-anthracite/70">
                  Excellent travail ! Vous avez répondu à tous les avis en attente.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setFilterUnanswered(false)}
                  className="mt-4"
                >
                  Voir tous les avis
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardContent className="py-12">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-anthracite/20 mx-auto mb-4" />
                <p className="text-lg font-medium text-anthracite mb-2">
                  Aucun avis pour le moment
                </p>
                <p className="text-anthracite/70">
                  Vous n'avez pas encore reçu d'avis de vos patients.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
