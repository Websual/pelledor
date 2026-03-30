/**
 * Utilitaire pour l'affichage de la note d'un praticien :
 * - Priorité aux avis Holia (table reviews) quand il y en a
 * - Sinon utilisation de la note Google pour éviter d'afficher 0.0
 * - isExternal permet d'afficher le logo Google dans l'UI quand la note vient de Google
 */

export type PractitionerRatingInput = {
  /** Moyenne des avis Holia (table reviews, synchro sur practitioners.rating_avg) */
  rating_avg?: number | null;
  /** Nombre d'avis Holia (table reviews) */
  _count?: { reviews?: number };
  /** Note Google Maps (enrichissement) */
  google_rating?: number | null;
  /** Nombre d'avis Google Maps */
  google_review_count?: number | null;
};

export type PractitionerRatingResult = {
  /** Note à afficher (Holia ou Google selon la logique) */
  rating: number;
  /** Nombre d'avis à afficher (celui qui correspond à la source de la note) */
  reviewCount: number;
  /** true = note Google, false = note Holia → permet d'afficher le logo Google dans l'UI */
  isExternal: boolean;
  /** Note Google (pour "meubler" le profil quand on affiche la note Holia) */
  googleRating: number | null;
  /** Nombre d'avis Google (pour affichage secondaire) */
  googleReviewCount: number | null;
  /** Note Holia (moyenne reviews) */
  holiaRating: number | null;
  /** Nombre d'avis Holia */
  holiaReviewCount: number;
};

/**
 * Retourne la note et le nombre d'avis à afficher pour un praticien.
 * - Si avis Holia > 0 : on affiche en priorité la note Holia (isExternal: false), et on renvoie aussi la note Google pour meubler le profil.
 * - Si avis Holia === 0 : on utilise la note Google comme note d'affichage (isExternal: true) pour éviter le 0.0.
 */
export function getPractitionerRating(practitioner: PractitionerRatingInput): PractitionerRatingResult {
  const holiaCount = practitioner._count?.reviews ?? 0;
  const holiaRating =
    practitioner.rating_avg != null && Number.isFinite(practitioner.rating_avg) ? practitioner.rating_avg : null;
  const googleRating =
    practitioner.google_rating != null && Number.isFinite(practitioner.google_rating)
      ? practitioner.google_rating
      : null;
  const googleCount =
    practitioner.google_review_count != null && Number.isFinite(practitioner.google_review_count)
      ? Math.max(0, Math.round(practitioner.google_review_count))
      : 0;

  if (holiaCount > 0) {
    return {
      rating: holiaRating ?? 0,
      reviewCount: holiaCount,
      isExternal: false,
      googleRating,
      googleReviewCount: googleCount > 0 ? googleCount : null,
      holiaRating,
      holiaReviewCount: holiaCount,
    };
  }

  if (googleRating != null && googleRating > 0) {
    return {
      rating: googleRating,
      reviewCount: googleCount,
      isExternal: true,
      googleRating,
      googleReviewCount: googleCount > 0 ? googleCount : null,
      holiaRating,
      holiaReviewCount: 0,
    };
  }

  return {
    rating: 0,
    reviewCount: 0,
    isExternal: false,
    googleRating,
    googleReviewCount: googleCount > 0 ? googleCount : null,
    holiaRating,
    holiaReviewCount: 0,
  };
}
