"use client";

export const dynamic = 'force-dynamic';

import { Button, Card, CardContent, CardHeader, CardTitle, Label, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Star, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Appointment {
  id: string;
  starts_at: string;
  status: "CONFIRMED" | "CANCELED" | "DONE";
  services: {
    id: string;
    name: string;
  } | null;
  reviews?: any[];
}

export default function NewReviewPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const practitionerId = searchParams?.get("practitionerId");

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  // Fetch user's completed appointments for this practitioner
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["appointments", "done", practitionerId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?status=DONE&practitionerId=${practitionerId}`);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
    enabled: !!practitionerId && !!session,
  });

  // Fetch practitioner info
  const { data: practitioner, isLoading: isLoadingPractitioner } = useQuery({
    queryKey: ["practitioner", practitionerId],
    queryFn: async () => {
      const res = await fetch(`/api/practitioners/${practitionerId}`);
      if (!res.ok) throw new Error("Failed to fetch practitioner");
      return res.json();
    },
    enabled: !!practitionerId,
  });

  // Create review mutation
  const createReview = useMutation({
    mutationFn: async (data: {
      appointmentId?: string;
      practitionerId: string;
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
      queryClient.invalidateQueries({ queryKey: ["practitioner", practitionerId] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      router.push(`/praticien/${practitioner?.slug}?review=success#avis`);
    },
  });

  if (!session) {
    if (typeof window !== "undefined") {
      router.push(`/connexion?redirect=/account/reviews/new?practitionerId=${practitionerId}`);
    }
    return null;
  }

  if (isLoadingPractitioner || isLoadingAppointments) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 pt-24">
          <Skeleton />
        </div>
      </main>
    );
  }

  if (!practitioner) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-anthracite/70">Praticien non trouvé</p>
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

    if (!practitionerId) {
      setError("Praticien non spécifié");
      return;
    }

    createReview.mutate({
      appointmentId: selectedAppointmentId || undefined,
      practitionerId,
      rating,
      comment: comment || undefined,
    });
  };

  if (session.status === 'loading') return <Skeleton />

  return (
    <main className="min-h-screen bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Colonne gauche - Formulaire */}
        <div className="flex items-center justify-center p-12 bg-white">
          <div className="w-full max-w-lg">
            <div className="mb-6">
              <Link
                href={`/praticien/${practitioner.slug}`}
                className="text-[#9bb49b] hover:text-[#8aa48a] transition-colors flex items-center gap-2 mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au profil
              </Link>
            </div>

            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle>Laisser un avis</CardTitle>
                <p className="text-sm text-anthracite/70 mt-2">
                  {practitioner.title}
                </p>
              </CardHeader>
              <CardContent>
            {/* Select appointment if available */}
            {isLoadingAppointments ? (
              <div className="mb-6">
                <Skeleton className="h-10 w-full rounded-2xl" />
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="mb-6">
                <Label>Pour quel rendez-vous ? (optionnel)</Label>
                <select
                  value={selectedAppointmentId || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedAppointmentId(value && value !== "" ? value : null);
                  }}
                  className="mt-2 flex h-10 w-full rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none"
                >
                  <option value="">Aucun rendez-vous spécifique</option>
                  {appointments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.services?.name || "Service"} - {new Date(apt.starts_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-anthracite/60 mt-1">
                  Vous pouvez laisser un avis même si vous n'avez pas réservé via Holia. Sélectionnez un rendez-vous si vous en avez un, sinon laissez "Aucun rendez-vous spécifique".
                </p>
              </div>
            ) : appointments && appointments.length === 0 ? (
              <div className="mb-6 p-4 bg-[#9bb49b]/10 border border-[#9bb49b]/20 rounded-2xl">
                <p className="text-sm text-anthracite/80">
                  Vous n'avez pas de rendez-vous terminé via Holia avec ce praticien, mais vous pouvez quand même laisser un avis si vous avez consulté ce praticien en dehors de la plateforme.
                </p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating */}
              <div>
                <Label>Note *</Label>
                <div className="flex items-center gap-3 mt-4">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`h-8 w-8 transition-all duration-200 ${
                          value <= (hoveredRating || rating)
                            ? "text-[#fbbf24] fill-[#fbbf24] drop-shadow-sm"
                            : "text-sable/30"
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
                  className="mt-2 flex min-h-[120px] w-full rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-anthracite/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={
                    createReview.isPending ||
                    rating === 0 ||
                    !practitionerId
                  }
                  className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createReview.isPending ? "Envoi en cours..." : "Publier l'avis"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/praticien/${practitioner.slug || practitionerId}`)}
                  disabled={createReview.isPending}
                >
                  Annuler
                </Button>
              </div>
              
              <p className="text-xs text-anthracite/50 mt-4 text-center">
                Votre avis sera modéré par notre équipe avant publication.
              </p>
            </form>
          </CardContent>
        </Card>
          </div>
        </div>

        {/* Colonne droite - Visuel */}
        <div className="relative hidden lg:block h-full min-h-screen">
          <div className="relative w-full h-full">
            <Image
              src="/images/review-zen.webp"
              alt="Votre expérience est précieuse"
              fill
              className="object-cover"
              priority
            />
            {/* Overlay sombre */}
            <div className="absolute inset-0 bg-black/30" />
            {/* Texte centré */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-10">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Votre expérience est précieuse.
              </h2>
              <p className="text-lg lg:text-xl text-white/90 max-w-md leading-relaxed">
                En partageant votre avis, vous aidez <span className="font-semibold">{practitioner.title}</span> à se faire connaître et vous guidez les autres patients dans leur recherche de bien-être.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
