"use client";

export const dynamic = "force-dynamic";

import { Card, CardContent, Skeleton } from "@/components/ui";
import { ReviewCard } from "@/components/review-card";
import { EditReviewModal } from "@/components/edit-review-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import Link from "next/link";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  createdAt: string;
  updatedAt: string;
  practitioner: {
    id: string;
    title: string;
    slug: string | null;
    photoUrl: string | null;
    locationCity: string;
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

export default function ReviewsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [deleteReview, setDeleteReview] = useState<Review | null>(null);

  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ["userReviews"],
    queryFn: async () => {
      const res = await fetch("/api/user/reviews");
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!session,
  });

  const updateReview = useMutation({
    mutationFn: async ({
      id,
      rating,
      comment,
    }: {
      id: string;
      rating: number;
      comment: string;
    }) => {
      const res = await fetch(`/api/user/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userReviews"] });
      queryClient.invalidateQueries({ queryKey: ["practitioner"] });
      setEditReview(null);
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/user/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete review");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userReviews"] });
      queryClient.invalidateQueries({ queryKey: ["practitioner"] });
      setDeleteReview(null);
    },
  });

  useEffect(() => {
    if (!session && typeof window !== "undefined") {
      router.push("/connexion");
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
            Mes avis
          </h1>
          <p className="text-anthracite/70">
            Consultez tous les avis que vous avez laissés
          </p>
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
          Mes avis
        </h1>
        <p className="text-anthracite/70">
          Consultez tous les avis que vous avez laissés
        </p>
      </div>

      {!reviews || reviews.length === 0 ? (
        <Card className="bg-white rounded-3xl border border-gray-100">
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-[#9bb49b]/10 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-[#9bb49b]" />
              </div>
              <h3 className="text-xl font-semibold text-anthracite mb-2">
                Aucun avis pour le moment
              </h3>
              <p className="text-anthracite/70 mb-6">
                Vous n&apos;avez pas encore laissé d&apos;avis. Partagez votre
                expérience après votre prochaine séance !
              </p>
              <Link href="/account/appointments">
                <span className="text-[#9bb49b] hover:underline font-medium">
                  Voir mes rendez-vous
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              rating={review.rating}
              comment={review.comment}
              response={review.response}
              createdAt={review.createdAt}
              practitioner={{
                name: review.practitioner.title,
                photoUrl: review.practitioner.photoUrl,
                slug: review.practitioner.slug,
                locationCity: review.practitioner.locationCity,
              }}
              responder={{
                name: review.practitioner.title,
                photoUrl: review.practitioner.photoUrl,
              }}
              appointmentInfo={
                review.appointment
                  ? {
                      startsAt: review.appointment.startsAt,
                      serviceName: review.appointment.service.name,
                    }
                  : undefined
              }
              onEdit={() => setEditReview(review)}
              onDelete={() => setDeleteReview(review)}
            />
          ))}
        </div>
      )}

      <EditReviewModal
        open={!!editReview}
        onClose={() => setEditReview(null)}
        initialRating={editReview?.rating ?? 0}
        initialComment={editReview?.comment ?? null}
        onSubmit={async (data) => {
          if (!editReview) return;
          await updateReview.mutateAsync({
            id: editReview.id,
            rating: data.rating,
            comment: data.comment,
          });
        }}
        isSubmitting={updateReview.isPending}
      />

      <ConfirmDialog
        open={!!deleteReview}
        title="Supprimer l'avis"
        message="Êtes-vous sûr de vouloir supprimer cet avis ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        onConfirm={() => {
          if (deleteReview) {
            deleteReviewMutation.mutate(deleteReview.id);
          }
        }}
        onCancel={() => setDeleteReview(null)}
      />
    </div>
  );
}
