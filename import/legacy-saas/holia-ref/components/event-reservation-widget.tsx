"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui";
import { Ticket, CreditCard, Banknote } from "lucide-react";

const OFFLINE_WARNING =
  "⚠️ En réservant, vous vous engagez à prévenir le praticien au moins 48h à l'avance en cas d'annulation. Un respect mutuel est la base de notre communauté.";

interface EventReservationWidgetProps {
  event: {
    id: string;
    slug: string;
    price_cents: number;
    remaining_places: number;
    capacity: number;
    allow_on_site_payment?: boolean;
    location_type?: string;
  };
}

function formatPrice(cents: number) {
  if (cents === 0) return "Gratuit";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function EventReservationWidget({ event }: EventReservationWidgetProps) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<"online" | "offline" | null>(null);

  const showPaymentChoice =
    event.allow_on_site_payment &&
    (event.location_type === "PRESENTIAL_ONLY" || event.location_type === "HYBRID");

  const handleReserveOnline = async () => {
    if (status !== "authenticated" || !session?.user) {
      window.location.href = `/connexion?callbackUrl=${encodeURIComponent(`/evenements/${event.slug}`)}`;
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/create-event-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      if (data?.url) window.location.href = data.url;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReserveOffline = async () => {
    if (status !== "authenticated" || !session?.user) {
      window.location.href = `/connexion?callbackUrl=${encodeURIComponent(`/evenements/${event.slug}`)}`;
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/reserve-offline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      if (data?.redirectUrl) window.location.href = data.redirectUrl;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-lg font-bold text-anthracite mb-4 flex items-center gap-2">
        <Ticket className="h-5 w-5 text-sauge" />
        Réserver ma place
      </h3>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-anthracite">
          <span className="text-anthracite/70">Prix</span>
          <span className="font-semibold text-lg text-sauge">
            {formatPrice(event.price_cents)}
          </span>
        </div>
        <div className="flex items-center justify-between text-anthracite">
          <span className="text-anthracite/70">Places restantes</span>
          <span className="font-medium">
            {event.remaining_places} / {event.capacity}
          </span>
        </div>
      </div>

      {showPaymentChoice && paymentChoice === null && (
        <div className="space-y-2 mb-6">
          <p className="text-sm font-medium text-anthracite">Mode de paiement</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentChoice("online");
                handleReserveOnline();
              }}
              disabled={isLoading || event.remaining_places <= 0}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-sauge hover:bg-sauge/5 transition-colors text-left disabled:opacity-50"
            >
              <CreditCard className="h-5 w-5 text-sauge" />
              <span>Payer en ligne par carte</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentChoice("offline")}
              disabled={isLoading || event.remaining_places <= 0}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-sauge hover:bg-sauge/5 transition-colors text-left disabled:opacity-50"
            >
              <Banknote className="h-5 w-5 text-sauge" />
              <span>Réserver et payer sur place</span>
            </button>
          </div>
        </div>
      )}

      {showPaymentChoice && paymentChoice === "offline" && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">{OFFLINE_WARNING}</p>
        </div>
      )}

      {(!showPaymentChoice || paymentChoice === "offline") && (
        <Button
          onClick={paymentChoice === "offline" ? handleReserveOffline : handleReserveOnline}
          disabled={isLoading || event.remaining_places <= 0}
          className="w-full bg-sauge hover:bg-sauge/90 text-white py-3 text-base font-semibold"
        >
          {event.remaining_places <= 0
            ? "Complet"
            : isLoading
            ? paymentChoice === "offline"
              ? "Réservation..."
              : "Redirection..."
            : paymentChoice === "offline"
            ? "Confirmer la réservation"
            : "Réserver ma place"}
        </Button>
      )}

      {event.price_cents === 0 && event.remaining_places > 0 && (
        <p className="text-xs text-anthracite/60 mt-3 text-center">
          Participation gratuite • Inscription requise
        </p>
      )}
    </div>
  );
}
