"use client";

export const dynamic = "force-dynamic";

import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MapPin, Star, Verified, Calendar, Heart, Search, StickyNote } from "lucide-react";
import Image from "next/image";
import { FavoriteNote } from "@/components/favorite-note";

interface Favorite {
  id: string;
  practitionerId: string;
  privateNote: string | null;
  createdAt: string;
  practitioner: {
    id: string;
    slug: string;
    title: string;
    bio: string;
    locationCity: string;
    ratingAvg: number;
    isVerified: boolean;
    photoUrl: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
    } | null;
    services: Array<{
      id: string;
      name: string;
      priceCents: number;
      durationMin: number;
    }>;
    _count: {
      reviews: number;
    };
  };
}

export default function FavoritesPage() {
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery<Favorite[]>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) throw new Error("Failed to fetch favorites");
      return res.json();
    },
    enabled: !!session,
  });

  const updateNote = useMutation({
    mutationFn: async ({ favoriteId, privateNote }: { favoriteId: string; privateNote: string }) => {
      const res = await fetch("/api/favorites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteId, privateNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save note");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (practitionerId: string) => {
      const res = await fetch(`/api/favorites?practitionerId=${practitionerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to remove favorite");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite"] });
    },
  });

  const handleBookAppointment = (practitioner: Favorite["practitioner"], serviceId?: string) => {
    if (!practitioner.slug) return;
    
    // Naviguer vers la page du praticien
    const url = `/praticien/${practitioner.slug}#booking-widget`;
    router.push(url);
    
    // Si un service est spécifié, déclencher l'événement après un court délai
    if (serviceId) {
      setTimeout(() => {
        const event = new CustomEvent("selectService", { detail: serviceId });
        window.dispatchEvent(event);
      }, 500);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace(".", ",") + " €";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-3xl" />
        ))}
      </div>
    );
  }

  if (session.status === 'loading') return <Skeleton className="h-64" />

  // Vérifier si la liste est vraiment vide (pas juste undefined)
  const isEmpty = !favorites || favorites.length === 0;

  return (
    <div>
      {!isEmpty ? (
        <div className="space-y-4">
          {favorites.map((favorite) => {
            const practitioner = favorite.practitioner;
            
            // Vérifications de sécurité
            if (!practitioner) return null;
            
            const services = practitioner.services || [];
            const firstService = services[0];
            const minPrice = services.length > 0
              ? Math.min(...services.map(s => s.priceCents))
              : null;

            return (
              <Card
                key={favorite.id}
                className="bg-white rounded-3xl border border-[#f1f5f1] hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex gap-4">
                    {/* Photo à gauche */}
                    <div className="flex-shrink-0">
                      {practitioner.photoUrl ? (
                        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-gray-100">
                          <Image
                            src={practitioner.photoUrl}
                            alt={practitioner.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
                          <Verified className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Contenu à droite */}
                    <div className="flex-1 min-w-0">
                      {/* Nom et badge vérifié */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Link
                            href={`/praticien/${practitioner.slug}`}
                            className="hover:text-[#9bb49b] transition-colors"
                          >
                            <h3 className="text-base md:text-lg font-bold text-gray-900 truncate hover:underline">
                              {practitioner.title}
                            </h3>
                          </Link>
                          {practitioner.isVerified && (
                            <Verified className="h-4 w-4 text-[#9bb49b] flex-shrink-0" />
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "Êtes-vous sûr de vouloir retirer ce praticien de vos favoris ?"
                              )
                            ) {
                              removeFavorite.mutate(practitioner.id);
                            }
                          }}
                          disabled={removeFavorite.isPending}
                          className="flex-shrink-0 p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
                          title="Retirer des favoris"
                        >
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        </button>
                      </div>

                      {/* Catégorie */}
                      {practitioner.category && (
                        <p className="text-xs md:text-sm text-gray-500 mb-2">
                          {practitioner.category.name}
                        </p>
                      )}

                      {/* Adresse */}
                      <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600 mb-2">
                        <MapPin className="h-3 w-3 md:h-4 md:w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{practitioner.locationCity}</span>
                      </div>

                      {/* Avis + Prix */}
                      <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs md:text-sm font-semibold text-gray-900">
                            {practitioner.ratingAvg.toFixed(1).replace(".", ",")} ({(practitioner._count?.reviews || 0)} avis)
                          </span>
                        </div>
                        {minPrice && (
                          <span className="text-xs md:text-sm font-semibold text-gray-900">
                            À partir de {formatPrice(minPrice)}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleBookAppointment(practitioner, firstService?.id)}
                          size="sm"
                          className="flex-1 bg-[#9bb49b] hover:bg-[#8aa48a] text-white text-xs md:text-sm"
                          disabled={!firstService || services.length === 0}
                        >
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1.5" />
                          {services.length === 0 ? "Aucun service" : "Prendre RDV"}
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-[#f1f5f1] hover:bg-[#f1f5f1] text-xs md:text-sm"
                        >
                          <Link href={`/praticien/${practitioner.slug}`}>
                            Voir le profil
                          </Link>
                        </Button>
                      </div>

                      {/* Note privée (post-it discret) */}
                      <FavoriteNote
                        favoriteId={favorite.id}
                        initialNote={favorite.privateNote}
                        onSave={async (favId, n) => {
                          await updateNote.mutateAsync({ favoriteId: favId, privateNote: n });
                        }}
                        isSaving={updateNote.isPending}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white rounded-3xl border border-[#f1f5f1]">
          <CardContent className="p-12 text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun favori pour le moment
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Vous n&apos;avez pas encore de praticiens en favoris. Explorez notre catalogue et ajoutez vos praticiens préférés pour un accès rapide.
            </p>
            <Button asChild className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white">
              <Link href="/recherche" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Explorer les praticiens
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
