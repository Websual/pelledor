"use client";

import { Skeleton } from "@/components/ui";

/**
 * Skeleton de chargement full-page pour uniformiser l’app.
 * Utiliser à la place d’un spinner ou d’un simple "Chargement...".
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Bloc type hero / titre */}
        <div className="mb-10 min-h-[88px]">
          <Skeleton className="h-10 w-3/4 max-w-md mb-4 min-w-[240px]" />
          <Skeleton className="h-5 w-full max-w-2xl mb-2 min-h-5" />
          <Skeleton className="h-5 w-full max-w-xl min-h-5" />
        </div>
        {/* Bloc contenu — dimensions fixes pour éviter CLS */}
        <div className="space-y-6 min-h-[320px]">
          <Skeleton className="h-8 w-48 min-w-[12rem]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-40 min-h-40 w-full rounded-3xl" />
            <Skeleton className="h-40 min-h-40 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-24 min-h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 min-h-24 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
