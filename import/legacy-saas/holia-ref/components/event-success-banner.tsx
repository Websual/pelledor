"use client";

import { CheckCircle } from "lucide-react";

interface EventSuccessBannerProps {
  amountCents: number;
}

function formatPrice(cents: number) {
  if (cents === 0) return "0 €";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function EventSuccessBanner({ amountCents }: EventSuccessBannerProps) {
  const priceStr = formatPrice(amountCents);

  return (
    <div className="mb-6 p-6 rounded-2xl bg-sauge/10 border border-sauge/30 flex items-start gap-4">
      <CheckCircle className="h-8 w-8 text-sauge flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-anthracite text-lg">Votre place est réservée !</p>
        <p className="text-anthracite/80 mt-1">
          Veuillez préparer le règlement de {priceStr} le jour J.
        </p>
      </div>
    </div>
  );
}
