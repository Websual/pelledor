"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function useStripeOnboarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const startOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/onboarding-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create onboarding link");
      }

      const data = await res.json();
      const url = data.url;
      
      if (!url) {
        throw new Error("No URL returned from server");
      }

      // Utiliser window.location.assign() pour une redirection complète de page
      // Cela évite les problèmes avec fetch() et les redirections
      window.location.assign(url);
    } catch (err: any) {
      console.error("Stripe onboarding error:", err);
      setError(err.message || "Erreur lors de l'activation des paiements");
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/stripe/onboarding-status");
      if (!res.ok) {
        throw new Error("Failed to check onboarding status");
      }
      return await res.json();
    } catch (err: any) {
      console.error("Error checking onboarding status:", err);
      return { complete: false, canAcceptPayments: false, detailsSubmitted: false };
    }
  };

  return {
    startOnboarding,
    checkStatus,
    loading,
    error,
  };
}


