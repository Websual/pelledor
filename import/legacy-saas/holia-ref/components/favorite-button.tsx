"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { useState } from "react";

interface FavoriteButtonProps {
  practitionerId: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function FavoriteButton({
  practitionerId,
  size = "sm",
  variant = "outline",
  className,
}: FavoriteButtonProps) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  // Check if practitioner is in favorites
  const { data: favoriteData, isLoading } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["favorite", practitionerId],
    queryFn: async () => {
      const res = await fetch(`/api/favorites/${practitionerId}`);
      if (!res.ok) throw new Error("Failed to check favorite");
      return res.json();
    },
    enabled: !!session,
  });

  const isFavorite = favoriteData?.isFavorite || false;

  // Add to favorites
  const addFavorite = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add favorite");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite", practitionerId] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  // Remove from favorites
  const removeFavorite = useMutation({
    mutationFn: async () => {
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
      queryClient.invalidateQueries({ queryKey: ["favorite", practitionerId] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  // Show skeleton during loading
  if (status === 'loading') {
    return (
      <Button
        variant={variant}
        size={size === "md" ? "default" : size}
        disabled
        className={`animate-pulse ${className || ""}`}
      >
        <Heart className="h-4 w-4 text-anthracite/30" />
        <span className="ml-2 text-anthracite/30">Chargement...</span>
      </Button>
    );
  }

  const handleClick = () => {
    if (!session) {
      // Redirect to sign in if not authenticated
      window.location.href = "/connexion";
      return;
    }

    if (isFavorite) {
      removeFavorite.mutate();
    } else {
      addFavorite.mutate();
    }
  };

  // Show button even if not logged in, but it will redirect to sign in
  return (
    <Button
      variant={variant}
      size={size === "md" ? "default" : size}
      onClick={handleClick}
      disabled={isLoading || addFavorite.isPending || removeFavorite.isPending}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`rounded-full transition-colors ${className || ""}`}
    >
      <Heart
        className={`h-4 w-4 ${
          isFavorite
            ? "text-[#9bb49b] fill-[#9bb49b]"
            : isHovered
            ? "text-[#9bb49b]"
            : "text-[#9bb49b]"
        }`}
      />
      <span className="ml-2">
        {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      </span>
    </Button>
  );
}

