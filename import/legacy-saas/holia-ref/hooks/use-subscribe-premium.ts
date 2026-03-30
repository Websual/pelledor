"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function useSubscribePremium() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const subscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/create-subscription-session", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create subscription session");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return {
    subscribe,
    loading,
    error,
  };
}


