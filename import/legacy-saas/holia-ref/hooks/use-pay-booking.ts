"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PayBookingParams {
  appointmentId: string;
  serviceId: string;
  practitionerId: string;
}

export function usePayBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const pay = async (params: PayBookingParams) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/create-booking-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create booking session");
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
    pay,
    loading,
    error,
  };
}


