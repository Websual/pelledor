"use client";

/**
 * Skeleton de la liste de résultats /recherche (cartes praticiens).
 * Aligné pixel-perfect sur le layout final pour éviter tout CLS :
 * mêmes classes (margin, padding), hauteurs/largeurs fixes ou min-height.
 */
export function SearchListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {/* Header : mêmes classes que la page réelle (Sélectionnez un praticien) */}
      <div className="p-4 md:p-6 pb-4 border-b border-sable bg-white">
        <div className="h-7 w-64 bg-gray-100 rounded-2xl animate-pulse mb-2" aria-hidden />
        <div className="h-4 w-full max-w-md bg-gray-100 rounded-2xl animate-pulse" aria-hidden />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col md:flex-row border-b border-sable min-h-[380px] md:min-h-[220px]"
            aria-hidden
          >
            {/* Image : même wrapper que la carte réelle (w-full md:w-[32%] flex-shrink-0), hauteur réservée pour éviter CLS */}
            <div
              className="w-full md:w-[32%] flex-shrink-0 min-h-[200px] md:min-h-[180px] aspect-[4/3] md:aspect-auto bg-gray-100 animate-pulse"
            />
            {/* Contenu : mêmes padding que la carte réelle (p-4 md:p-6), mêmes espacements (mb-2, mb-3, mb-4) */}
            <div className="flex-1 p-4 md:p-6 relative min-w-0">
              {/* Nom (h3 text-lg md:text-xl mb-2) */}
              <div className="h-6 w-3/4 max-w-[200px] bg-gray-100 rounded-2xl animate-pulse mb-2" />
              {/* Adresse (mb-3) */}
              <div className="h-4 w-full max-w-[280px] bg-gray-100 rounded-2xl animate-pulse mb-3" />
              {/* Note + prix (mb-4) */}
              <div className="flex flex-wrap items-center gap-2 gap-y-1 mb-4">
                <div className="h-4 w-24 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="h-4 w-28 bg-gray-100 rounded-2xl animate-pulse" />
              </div>
              {/* Bloc calendrier / CTA (mb-4) — hauteur fixe pour ne pas bouger */}
              <div className="min-h-[80px] mb-4 rounded-xl bg-gray-100 animate-pulse" />
              {/* Footer (mt-3 pt-3 border-t) */}
              <div className="mt-3 pt-3 border-t border-sable/30 flex items-center justify-between gap-4">
                <div className="flex gap-3">
                  <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-24 bg-gray-100 rounded-2xl animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
