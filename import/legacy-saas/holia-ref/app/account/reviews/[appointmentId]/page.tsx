"use client";

export const dynamic = 'force-dynamic';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Star, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Appointment {
  id: string;
  startsAt: string;
  status: "CONFIRMED" | "CANCELED" | "DONE";
  service: {
    id: string;
    name: string;
  };
  practitioner: {
    id: string;
    title: string;
    locationCity: string;
  };
  review: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
}

export default function ReviewPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const appointmentId = params?.appointmentId as string;

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  // Fetch appointment
  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}`);
      if (!res.ok) throw new Error("Failed to fetch appointment");
      return res.json();
    },
    enabled: !!appointmentId && !!session,
  });

  useEffect(() => {
    if (appointment?.review) {
      setRating(appointment.review.rating);
      setComment(appointment.review.comment || "");
    }
  }, [appointment]);

  // Create or update review mutation
  const createReview = useMutation({
    mutationFn: async (data: {
      appointmentId: string;
      rating: number;
      comment?: string;
    }) => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["practitioner", appointment?.practitioner.id] });
      router.push("/account/appointments?review=success");
    },
  });

  if (!session) {
    if (typeof window !== "undefined") {
      router.push("/connexion");
    }
    return null;
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!appointment) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-anthracite/70">Réservation non trouvée</p>
        </div>
      </main>
    );
  }

  if (appointment.status !== "DONE") {
    return (
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Impossible de laisser un avis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-anthracite/70 mb-4">
                  Vous ne pouvez laisser un avis que pour les rendez-vous terminés.
                </p>
                <Button asChild>
                  <Link href="/account/appointments">Retour aux réservations</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Veuillez sélectionner une note");
      return;
    }

    createReview.mutate({
      appointmentId: appointment.id,
      rating,
      comment: comment || undefined,
    });
  };

  if (session.status === 'loading') return <Skeleton />

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-2xl">
        <div className="mb-8">
          <Link
            href="/account/appointments"
            className="text-sauge hover:text-sauge/80 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux réservations
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Laisser un avis</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Appointment Summary */}
            <div className="mb-6 p-4 bg-sable/50 rounded-2xl">
              <h3 className="font-semibold text-anthracite mb-2">
                {appointment.practitioner.title}
              </h3>
              <p className="text-sm text-anthracite/70 mb-1">
                {appointment.service.name}
              </p>
              <p className="text-sm text-anthracite/60">
                {format(new Date(appointment.startsAt), "EEEE d MMMM yyyy à HH:mm", {
                  locale: fr,
                })}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating */}
              <div>
                <Label>Note *</Label>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          value <= (hoveredRating || rating)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-sable"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-anthracite/60 mt-2">
                    {rating === 5
                      ? "Excellent"
                      : rating === 4
                      ? "Très bien"
                      : rating === 3
                      ? "Bien"
                      : rating === 2
                      ? "Moyen"
                      : "Mauvais"}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <Label htmlFor="comment">Commentaire (optionnel)</Label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={createReview.isPending}
                  placeholder="Partagez votre expérience..."
                  rows={6}
                  className="flex min-h-[120px] w-full rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-anthracite/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {createReview.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-600">
                    {createReview.error instanceof Error
                      ? createReview.error.message
                      : "Une erreur est survenue"}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  disabled={createReview.isPending || rating === 0}
                >
                  {createReview.isPending ? "Envoi en cours..." : "Publier l'avis"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/account/appointments")}
                  disabled={createReview.isPending}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

