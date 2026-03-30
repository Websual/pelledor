"use client";
import Link from "next/link";
import { Card, CardContent, Button } from "@/components/ui";
import { getPractitionerRating } from "@/lib/practitioner-rating";
import { GoogleIcon } from "@/components/google-icon";

import { MapPin, Star, Verified, Clock, Euro, Phone, Globe } from "lucide-react";
import Image from "next/image";

/** Bio affichée : bio réelle ou template SEO pour fiches INSEE sans bio. */
function getDisplayBio(p: {
  bio: string | null | undefined;
  sourceUrl?: string | null;
  title: string;
  locationCity: string;
  profession?: { name: string } | null;
}): string {
  if (p.bio != null && String(p.bio).trim() !== "") return p.bio.trim();
  if (p.sourceUrl === "INSEE") {
    const name = p.title.includes(" - ") ? p.title.split(" - ")[0] : p.title;
    const profession = p.profession?.name ?? "Praticien";
    return `Retrouvez toutes les informations professionnelles de ${name}, ${profession} à ${p.locationCity}. Profil référencé via les registres officiels de l'INSEE. Prenez le contrôle de cette fiche pour ajouter votre présentation complète.`;
  }
  return "";
}

interface Practitioner {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  address: string | null;
  locationCity: string;
  ratingAvg: number;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  isVerified: boolean;
  photoUrl: string | null;
  phone?: string | null;
  website?: string | null;
  sourceUrl?: string | null;
  profession: {
    id: string;
    name: string;
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

interface PractitionersListProps {
  practitioners: Practitioner[];
  emptyTitle: string;
  emptyDescription: string;
  showCategory?: boolean;
  compact?: boolean;
}

export function PractitionersList({
  practitioners,
  emptyTitle,
  emptyDescription,
  showCategory = false,
  compact = false
}: PractitionersListProps) {
  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2) + "€";
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
  };

  if (practitioners.length === 0) {
    return (
      <Card className="bg-white rounded-3xl shadow-sm border border-sable/10">
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-sauge/10 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 border-2 border-sauge/30 border-t-sauge rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-anthracite mb-2">
            {emptyTitle}
          </h3>
          <p className="text-anthracite/70 mb-6 max-w-md mx-auto">
            {emptyDescription}
          </p>
          <Button asChild className="bg-sauge hover:bg-sauge-dark text-white px-6">
            <Link href="/pro">
              <div className="w-4 h-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              Devenir praticien
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {practitioners.map((practitioner) => (
        <Card key={practitioner.id} className="bg-white rounded-3xl shadow-sm border border-sable/10 hover:shadow-md transition-shadow">
          <CardContent className={`p-6 ${compact ? 'p-4' : 'p-6'}`}>
            <div className="flex gap-4">
              {/* Photo */}
              <div className="relative w-16 h-16 rounded-3xl border border-sable overflow-hidden flex-shrink-0">
                {practitioner.photoUrl ? (
                  <Image
                    src={practitioner.photoUrl}
                    alt={practitioner.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-sauge/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-sauge">
                      {practitioner.title.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Nom et vérification */}
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-anthracite text-lg">
                        {practitioner.title}
                      </h2>
                      {practitioner.isVerified && (
                        <Verified className="h-4 w-4 text-sauge" />
                      )}
                      {showCategory && practitioner.profession && (
                        <span className="text-xs bg-sauge/10 text-sauge px-2 py-1 rounded">
                          {practitioner.profession.name}
                        </span>
                      )}
                    </div>

                    {/* Note et avis (Holia ou Google selon getPractitionerRating) */}
                    {(() => {
                      const { rating, reviewCount, isExternal } = getPractitionerRating({
                        rating_avg: practitioner.ratingAvg,
                        _count: practitioner._count,
                        google_rating: practitioner.googleRating,
                        google_review_count: practitioner.googleReviewCount,
                      });
                      if (rating <= 0) return null;
                      const ratingTitle = isExternal
                        ? "Avis public récupéré via Google Business Profile."
                        : "Avis certifié suite à une consultation réelle sur la plateforme.";
                      return (
                        <div
                          className="flex items-center gap-1.5 mb-2 flex-wrap"
                          title={ratingTitle}
                        >
                          {isExternal ? (
                            <GoogleIcon size={14} className="text-anthracite/70" aria-label="Note Google" />
                          ) : (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-anthracite">
                            {rating.toFixed(1)}
                          </span>
                          <span className="text-sm text-anthracite/60">
                            ({reviewCount} avis)
                          </span>
                        </div>
                      );
                    })()}

                    {/* Adresse */}
                    {practitioner.address && (
                      <div className="flex items-center gap-1 text-sm text-anthracite/60 mb-2">
                        <MapPin className="h-3 w-3" />
                        <span>{practitioner.address}</span>
                      </div>
                    )}

                    {/* Bio courte ou template INSEE */}
                    {(() => {
                      const displayBio = getDisplayBio({
                        bio: practitioner.bio,
                        sourceUrl: practitioner.sourceUrl,
                        title: practitioner.title,
                        locationCity: practitioner.locationCity,
                        profession: practitioner.profession,
                      });
                      if (!displayBio) return null;
                      const maxLen = compact ? 100 : 120;
                      return (
                        <p className="text-sm text-anthracite/70 line-clamp-2 mb-3">
                          {displayBio.substring(0, maxLen)}
                          {displayBio.length > maxLen && "..."}
                        </p>
                      );
                    })()}

                    {/* Services */}
                    {practitioner.services.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {practitioner.services.slice(0, compact ? 1 : 2).map((service) => (
                          <div key={service.id} className="flex items-center gap-1 text-xs bg-sauge/10 text-sauge px-2 py-1 rounded">
                            <span>{service.name}</span>
                            <span className="text-anthracite/60">•</span>
                            <span>{formatPrice(service.priceCents)}</span>
                            {!compact && (
                              <>
                                <span className="text-anthracite/60">•</span>
                                <span>{formatDuration(service.durationMin)}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Contact */}
                    <div className="flex items-center gap-4 text-xs text-anthracite/60">
                      {practitioner.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{practitioner.phone}</span>
                        </div>
                      )}
                      {practitioner.website && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span>Site web</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bouton */}
                  <div className="flex-shrink-0">
                    <Button asChild size={compact ? "sm" : "default"} className="bg-sauge hover:bg-sauge-dark text-white">
                      <Link href={`/praticien/${practitioner.slug}`}>
                        Voir le profil
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}