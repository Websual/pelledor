"use client";

import React, { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      matrix[i][j] =
        str2.charAt(i - 1) === str1.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }
  return matrix[str2.length][str1.length];
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 95;
  if (Math.max(s1.length, s2.length) === 0) return 100;
  const editDistance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return ((maxLength - editDistance) / maxLength) * 100;
}
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { MapPin, Star, Verified, ChevronLeft, ChevronRight, Clock, Euro, Phone, Globe, Languages as LanguagesIcon, Shield, Instagram, Linkedin, Facebook } from "lucide-react";
import { getPractitionerRating } from "@/lib/practitioner-rating";
import { GoogleIcon } from "@/components/google-icon";
import { FavoriteButton } from "@/components/favorite-button";
import { PractitionersMap } from "@/components/practitioners-map";
import { SimpleAvailability } from "@/components/simple-availability";
import { SearchFilters } from "@/components/search-filters";
import { SearchListSkeleton } from "@/components/search-list-skeleton";
import { AdBanner } from "@/components/ui/AdBanner";
import Image from "next/image";

interface Practitioner {
  id: string;
  slug: string;
  title: string;
  bio: string;
  address: string | null;
  locationCity: string;
  ratingAvg: number;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  isVerified: boolean;
  isClaimed?: boolean;
  photoUrl: string | null;
  lat?: number | null;
  lng?: number | null;
  distance?: number;
  phone?: string | null;
  website?: string | null;
  instagramUrl?: string | null;
  linkedInUrl?: string | null;
  facebookUrl?: string | null;
  languages?: string[];
  paymentMethods?: string[];
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
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [professions, setProfessions] = useState<Array<{ id: string; name: string; slug: string; practitionerCount?: number }>>([]);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string | undefined>();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Source unique de vérité : URL via searchParams
  const searchQuery = searchParams.get("q") || "";
  const searchCity = searchParams.get("city") || "";
  const professionId = searchParams.get("professionId") || "";
  const subjectId = searchParams.get("subjectId") || "";
  const minRating = searchParams.get("minRating") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sortBy = (searchParams.get("sortBy") as "rating" | "price" | "distance") || "rating";
  const boundsParam = searchParams.get("bounds");
  const mapBounds = boundsParam ? (() => {
    const [north, south, east, west] = boundsParam.split(',').map(parseFloat);
    if (north && south && east && west) {
      return { north, south, east, west };
    }
    return null;
  })() : null;

  // Fonction debounced pour la recherche dans les bounds (500ms)
  const debouncedSearchInBounds = useMemo(
    () =>
      debounce((bounds: { north: number; south: number; east: number; west: number }) => {
        const params = new URLSearchParams(window.location.search);
        params.set('bounds', `${bounds.north},${bounds.south},${bounds.east},${bounds.west}`);
        params.set('sortBy', 'distance');
        params.delete('city');
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
      }, 500),
    []
  );

  // Gérer la recherche dans les bounds de la carte
  const handleSearchInBounds = (bounds: { north: number; south: number; east: number; west: number }) => {
    debouncedSearchInBounds(bounds);
  };

  // Fonction utilitaire pour debounce
  function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    }) as T;
  }

  // Fetch professions (toutes pour afficher les choix, même avec 0 praticiens)
  useEffect(() => {
    fetch("/api/professions?all=true")
      .then((res) => res.json())
      .then((data) => setProfessions(data))
      .catch((err) => console.error("Error fetching professions:", err));
  }, []);

  // Ref pour contrôler la carte depuis l'extérieur
  const mapFlyToRef = useRef<((coords: { lat: number; lng: number }) => void) | null>(null);
  
  // Lire la page depuis l'URL
  const page = parseInt(searchParams.get("page") || "1");

  // Get user location - seulement si on n'utilise pas les bounds
  useEffect(() => {
    if (navigator.geolocation && sortBy === "distance" && !mapBounds) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback to city search if geolocation fails
        }
      );
    }
  }, [sortBy, mapBounds]);

  // La carte est contrôlée uniquement via onCitySelected callback
  // Pas de geocode automatique depuis l'URL pour éviter les conflits
  // Les coordonnées viennent directement de l'API Adresse Gouv dans les suggestions

  const limit = 40;
  
  const setPage = useCallback((newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
    // Ne pas déclencher popstate - React Query détectera le changement via useSearchParams
    // window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // Reset page to 1 when filters change (via URL) - mais pas quand page change
  const prevFiltersRef = useRef({ searchQuery, searchCity, professionId, minRating, maxPrice, sortBy });
  useEffect(() => {
    const prevFilters = prevFiltersRef.current;
    const filtersChanged = 
      prevFilters.searchQuery !== searchQuery ||
      prevFilters.searchCity !== searchCity ||
      prevFilters.professionId !== professionId ||
      prevFilters.minRating !== minRating ||
      prevFilters.maxPrice !== maxPrice ||
      prevFilters.sortBy !== sortBy;
    
    if (filtersChanged && page !== 1) {
      setPage(1);
    }
    
    prevFiltersRef.current = { searchQuery, searchCity, professionId, minRating, maxPrice, sortBy };
  }, [searchQuery, searchCity, professionId, minRating, maxPrice, sortBy, page, setPage]);

  // Fetch practitioners with pagination
  const { data: searchData, isLoading, isFetching, refetch } = useQuery<{
    practitioners: Practitioner[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>({
    queryKey: [
      "practitioners",
      searchQuery,
      mapBounds ? "bounds" : searchCity, // Pas de ville par défaut : sans ville = tous les praticiens
      professionId,
      minRating,
      maxPrice,
      sortBy,
      page,
      userLocation?.lat,
      userLocation?.lng,
      mapBounds ? `${mapBounds.north}-${mapBounds.south}-${mapBounds.east}-${mapBounds.west}` : null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);

      // Utiliser les bounds si disponibles, sinon la ville uniquement si elle est renseignée
      if (mapBounds) {
        params.append("bounds", `${mapBounds.north},${mapBounds.south},${mapBounds.east},${mapBounds.west}`);
        params.append("sortBy", "distance");
      } else if (searchCity.trim() !== "") {
        params.append("city", searchCity.trim());
      }

      if (professionId) params.append("professionId", professionId);
      if (subjectId) params.append("subjectId", subjectId);
      if (minRating) params.append("minRating", minRating);
      if (maxPrice) params.append("maxPrice", maxPrice);
      // Gérer le tri par distance selon le contexte
      if (sortBy === "distance") {
        if (mapBounds) {
          // Quand on utilise les bounds, calculer la distance par rapport au centre de la vue
          const centerLat = (mapBounds.north + mapBounds.south) / 2;
          const centerLng = (mapBounds.east + mapBounds.west) / 2;
          params.append("lat", centerLat.toString());
          params.append("lng", centerLng.toString());
          params.append("sortBy", "distance");
          // Étendre la zone de recherche pour couvrir toute la vue
          const latDiff = Math.abs(mapBounds.north - mapBounds.south);
          const lngDiff = Math.abs(mapBounds.east - mapBounds.west);
          const searchRadius = Math.max(latDiff, lngDiff) * 111; // Approximation km
          params.append("distance", Math.max(searchRadius, 10).toString());
        } else if (userLocation) {
          // Tri par distance par rapport à la position utilisateur
          params.append("lat", userLocation.lat.toString());
          params.append("lng", userLocation.lng.toString());
          params.append("sortBy", "distance");
          params.append("distance", "50"); // Default 50km
        }
      } else if (sortBy && !mapBounds) {
        // Autres types de tri (rating, price) seulement si pas de bounds
        params.append("sortBy", sortBy);
      }
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(`/api/practitioners?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch practitioners");
      return res.json();
    },
    enabled: true, // Toujours activer la requête pour le moment
  });

  const practitioners = searchData?.practitioners || [];
  const pagination = searchData?.pagination;

  // Détecter si on a exactement 1 résultat avec correspondance à 90%
  const singleResultMatch = useMemo(() => {
    if (practitioners.length !== 1 || !searchQuery) return null;
    
    const practitioner = practitioners[0];
    const practitionerName = practitioner.title || "";
    const similarity = calculateSimilarity(searchQuery, practitionerName);
    
    if (similarity >= 90) {
      return {
        practitioner,
        similarity,
      };
    }
    
    return null;
  }, [practitioners, searchQuery]);

  // Surveiller les changements d'URL pour déclencher un refetch
  // Note: React Query se met automatiquement à jour quand les queryKey changent,
  // donc on n'a pas besoin de refetch manuel. On garde juste l'écoute pour les cas spéciaux.
  useEffect(() => {
    const handleUrlChange = () => {
      // Ne pas refetch automatiquement - React Query le fait déjà via les queryKey
      // refetch() est appelé seulement si nécessaire
    };

    // Écouter les changements d'URL (popstate pour navigation navigateur)
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []); // Pas de dépendances - le listener est stable


  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  // Composant pour le rendu de la liste des praticiens (sans la carte)
  const renderPractitionersList = () => {
    if (!practitioners || practitioners.length === 0) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-anthracite/70">Aucun praticien trouvé.</p>
        </div>
      );
    }

    return (
      <>
        {/* Titre et texte */}
        <div className="p-4 md:p-6 pb-4 border-b border-sable bg-white">
          <h1 className="text-xl md:text-2xl font-bold font-heading text-anthracite mb-2">
            Sélectionnez un praticien
          </h1>
          <p className="text-sm md:text-base text-anthracite/70">
            Les meilleurs praticiens en bien-être aux alentours : Réservation en ligne
          </p>
        </div>

        {/* Liste des praticiens */}
        <div className="flex flex-col">
            {practitioners.map((practitioner, index) => {
              const minServicePrice = practitioner.services.length > 0
                ? Math.min(...practitioner.services.map((s) => s.priceCents))
                : null;

              return (
                <React.Fragment key={practitioner.id}>
                <div
                  id={`practitioner-${practitioner.id}`}
                  className={`flex flex-col md:flex-row border-b border-sable min-h-[380px] md:min-h-[220px] ${
                    selectedPractitionerId === practitioner.id ? "bg-sauge/5" : ""
                  }`}
                >
                  {/* Image à gauche (30-35%) — min-height pour éviter CLS au chargement */}
                  <div className="w-full md:w-[32%] flex-shrink-0 relative self-stretch min-h-[200px] md:min-h-[180px] aspect-[4/3] md:aspect-auto">
                    {practitioner.photoUrl ? (
                      <Image
                        src={practitioner.photoUrl}
                        alt={practitioner.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 32vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-[#9bb49b]/10 flex items-center justify-center">
                        <div className="text-[#9bb49b] font-bold text-lg">
                          {practitioner.title
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase())
                            .slice(0, 2)
                            .join('')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contenu à droite */}
                  <div className="flex-1 p-4 md:p-6 relative">
                    {/* Badge profil certifié — mobile: au-dessus du nom, desktop: flottant à droite */}
                    {!practitioner.isClaimed && (practitioner._count?.reviews || 0) === 0 && (
                      <div className="mb-2 md:mb-0 md:absolute md:top-6 md:right-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-2xl bg-[#9bb49b]/10 text-[#9bb49b] text-xs font-medium border border-[#9bb49b]/30">
                          <Shield className="h-4 w-4" /> Profil certifié (Données publiques)
                        </span>
                      </div>
                    )}

                    {/* Nom du praticien */}
                    <Link
                      href={`/praticien/${practitioner.slug}`}
                      className="hover:text-sauge transition-colors"
                    >
                      <h3 className="text-lg md:text-xl font-bold font-heading text-anthracite mb-2 hover:underline">
                        {practitioner.title}
                      </h3>
                    </Link>

                    {/* Adresse */}
                    <div className="flex items-center gap-1 text-xs md:text-sm text-anthracite/70 mb-3">
                      <MapPin className="h-3 w-3 md:h-4 md:w-4 text-anthracite/60" />
                      <span>
                        {practitioner.address && `${practitioner.address}`}
                      </span>
                      {practitioner.distance !== undefined && (
                        <>
                          <span className="text-anthracite/50">•</span>
                          <span>
                            {practitioner.distance < 1
                              ? `${Math.round(practitioner.distance * 1000)} m`
                              : `${practitioner.distance.toFixed(1)} km`}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Note (Holia ou Google) + Prix */}
                    {(() => {
                      const { rating, reviewCount, isExternal, googleRating, googleReviewCount } = getPractitionerRating({
                        rating_avg: practitioner.ratingAvg,
                        _count: practitioner._count,
                        google_rating: practitioner.googleRating,
                        google_review_count: practitioner.googleReviewCount,
                      });
                      const showRating = rating > 0;
                      const showPrice = minServicePrice && !isNaN(minServicePrice);
                      if (!showRating && !showPrice) return null;
                      return (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 flex-wrap">
                          {showRating && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                title={isExternal ? "Avis public récupéré via Google Business Profile." : "Avis certifié suite à une consultation réelle sur la plateforme."}
                                className="flex items-center gap-1.5"
                              >
                                {isExternal ? (
                                  <GoogleIcon size={16} className="text-anthracite/80" />
                                ) : (
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                )}
                                <span className="text-xs md:text-sm font-semibold text-anthracite">
                                  {rating.toFixed(1).replace(".", ",")} ({reviewCount} avis)
                                </span>
                              </span>
                              {!isExternal && googleRating != null && googleReviewCount != null && googleReviewCount > 0 && (
                                <span
                                  className="text-xs text-anthracite/60 flex items-center gap-0.5"
                                  title="Avis public récupéré via Google Business Profile."
                                >
                                  <GoogleIcon size={12} className="text-anthracite/60" />
                                  {googleRating.toFixed(1).replace(".", ",")} ({googleReviewCount} Google)
                                </span>
                              )}
                            </div>
                          )}
                          {showPrice && (
                            <span className="text-xs md:text-sm font-semibold text-anthracite">
                              À partir de {formatPrice(minServicePrice).replace(".", ",")} €
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Calendrier simplifié ou placeholder si non réclamé */}
                    <div className="mb-4">
                      {practitioner.isClaimed ? (
                        <SimpleAvailability
                          practitionerId={practitioner.id}
                          serviceId={practitioner.services[0]?.id || null}
                        />
                      ) : (
                        <div className="rounded-xl p-4 bg-[#9bb49b]/5 border border-[#9bb49b]/20 text-center">
                          <p className="text-sm text-anthracite/70">
                            La prise de rendez-vous en ligne n&apos;est pas encore activée pour ce praticien.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer de carte : icônes à gauche, lien/boutons à droite */}
                    <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-sable/30">
                      <div className="flex items-center gap-3 min-w-0">
                        {practitioner.website && (
                          <a
                            href={practitioner.website.startsWith("http") ? practitioner.website : `https://${practitioner.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-anthracite/50 hover:text-[#9bb49b] transition-colors shrink-0"
                            title="Site web"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {practitioner.phone && (
                          <a
                            href={`tel:${practitioner.phone.replace(/\s/g, "")}`}
                            className="text-anthracite/50 hover:text-[#9bb49b] transition-colors shrink-0"
                            title="Téléphone"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {practitioner.instagramUrl && (
                          <a
                            href={practitioner.instagramUrl.startsWith("http") ? practitioner.instagramUrl : `https://${practitioner.instagramUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-anthracite/50 hover:text-[#9bb49b] transition-colors shrink-0"
                            title="Instagram"
                          >
                            <Instagram className="h-4 w-4" />
                          </a>
                        )}
                        {practitioner.linkedInUrl && (
                          <a
                            href={practitioner.linkedInUrl.startsWith("http") ? practitioner.linkedInUrl : `https://${practitioner.linkedInUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-anthracite/50 hover:text-[#9bb49b] transition-colors shrink-0"
                            title="LinkedIn"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        {practitioner.facebookUrl && (
                          <a
                            href={practitioner.facebookUrl.startsWith("http") ? practitioner.facebookUrl : `https://${practitioner.facebookUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-anthracite/50 hover:text-[#9bb49b] transition-colors shrink-0"
                            title="Facebook"
                          >
                            <Facebook className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center shrink-0">
                        {practitioner.isClaimed ? (
                          <Link
                            href={`/praticien/${practitioner.slug}`}
                            className="text-xs md:text-sm text-sauge hover:underline"
                          >
                            Plus d&apos;informations
                          </Link>
                        ) : (
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Button asChild size="sm" className="bg-[#9bb49b] hover:bg-[#8aa483] text-white">
                              <Link href={`/praticien/${practitioner.slug}`}>Voir la fiche</Link>
                            </Button>
                            {session?.user ? (
                              <span
                                className="inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-medium bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-200"
                                aria-disabled="true"
                              >
                                Réclamez ce profil (réservé aux visiteurs non connectés)
                              </span>
                            ) : (
                              <Button asChild variant="outline" size="sm" className="border-sauge/50 text-sauge hover:bg-sauge/5">
                                <Link href={`/inscription?claim=${practitioner.id}`}>C&apos;est vous ? Réclamez ce profil</Link>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {index % 5 === 0 && index !== 0 && (
                  <div className="w-full [grid-column:1/-1] border-b border-sable bg-white/50 py-4 px-4 md:px-6">
                    <AdBanner
                      dataAdSlot="9380232076"
                      dataAdFormat="auto"
                      dataFullWidthResponsive
                    />
                  </div>
                )}
                </React.Fragment>
              );
            })}
        </div>

        {/* Pagination - Juste après la liste des praticiens */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 sm:px-6 lg:px-8 py-6 border-t border-sable bg-white">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPreviousPage}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNextPage}
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Results count */}
            {pagination && (
              <div className="mt-4 text-center text-sm text-anthracite/60">
                Affichage de {practitioners.length} sur {pagination.total} praticiens
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <main className="bg-[#f7f7f7] min-h-screen pt-24">
      <div className="min-h-screen flex flex-col">
        {/* Barre des filtres Premium */}
        <SearchFilters
          searchCity={searchCity}
          professionId={professionId}
          minRating={minRating}
          maxPrice={maxPrice}
          sortBy={sortBy}
          professions={professions}
          mapBounds={mapBounds}
          onLocationDetected={(cityName) => {
            console.log('Ville détectée:', cityName);
          }}
          onCitySelected={(coords) => {
            // Centrer la carte sur la ville sélectionnée via la ref
            // Cette fonction est appelée directement depuis les suggestions avec les coordonnées de l'API Adresse Gouv
            // Pas besoin de geocoder, les coordonnées sont déjà disponibles
            if (mapFlyToRef.current) {
              mapFlyToRef.current(coords);
            } else {
              // Si la ref n'est pas encore initialisée, attendre un peu (cas rare)
              const checkRef = setInterval(() => {
                if (mapFlyToRef.current) {
                  mapFlyToRef.current(coords);
                  clearInterval(checkRef);
                }
              }, 100);
              // Timeout de sécurité après 2 secondes
              setTimeout(() => clearInterval(checkRef), 2000);
            }
          }}
        />

        {/* Content scrollable avec carte - Layout naturel avec sticky */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[45%_55%] gap-0" style={{ pointerEvents: "auto" }}>
          {/* Liste des praticiens à gauche (45%) - Scrollable naturellement */}
          <div className="border-r-0 md:border-r border-sable order-1 md:order-1 bg-white">
            {/* Indicateur de chargement uniquement sur la liste */}
            {isFetching && !isLoading && (
              <div className="p-3 border-b border-sable bg-white flex items-center justify-center gap-2">
                <div className="h-3 w-24 bg-sable/20 rounded animate-pulse" />
              </div>
            )}
            {/* Contenu de la liste */}
            {isLoading ? (
              <SearchListSkeleton count={8} />
            ) : (
              <>
                {/* Bouton auto-redirect si 1 résultat avec correspondance à 90% */}
                {singleResultMatch && (
                  <div className="p-4 border-b border-sable bg-[#9bb49b]/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-anthracite/70 mb-1">
                          Résultat exact trouvé ({Math.round(singleResultMatch.similarity)}% de correspondance)
                        </p>
                        <p className="text-base font-medium text-anthracite">
                          {singleResultMatch.practitioner.title}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          router.push(`/praticien/${singleResultMatch.practitioner.slug}`);
                        }}
                        className="ml-4 px-4 py-2 bg-[#9bb49b] hover:bg-[#8aa483] text-white rounded-2xl transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        Voir la fiche complète
                      </button>
                    </div>
                  </div>
                )}
                {sortBy === "distance" && !userLocation && !mapBounds ? (
              <div className="h-full flex flex-col items-center justify-center p-12">
                <p className="text-anthracite/70 mb-4">
                  Autorisez l&apos;accès à votre localisation pour trier par distance.
                </p>
                <Button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setUserLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                          });
                        },
                        (error) => {
                          console.error("Error getting location:", error);
                          alert("Impossible d'accéder à votre localisation. Veuillez vérifier les permissions de votre navigateur.");
                        }
                      );
                    }
                  }}
                >
                  Autoriser la localisation
                </Button>
              </div>
            ) : (
              renderPractitionersList()
            )}
            </>
            )}
          </div>

          {/* Carte à droite (55%) - Sticky fixe */}
          <div className="h-[400px] md:sticky md:top-28 md:h-[calc(100vh-8rem)] order-2 md:order-2" style={{ pointerEvents: "auto", zIndex: 10 }}>
            <PractitionersMap
              selectedPractitionerId={selectedPractitionerId}
              onPractitionerSelect={setSelectedPractitionerId}
              onSearchInBounds={handleSearchInBounds}
              userLocation={userLocation}
              searchCity={searchCity}
              activeIds={practitioners.map(p => p.id)}
              onMapReady={(flyToFn) => {
                mapFlyToRef.current = flyToFn;
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}
