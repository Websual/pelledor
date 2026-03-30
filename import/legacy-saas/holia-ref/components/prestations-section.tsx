"use client";

import { Clock, Euro } from "lucide-react";
import { Button } from "@/components/ui";

interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  locationType?: "PRESENTIAL_ONLY" | "VIDEO_ONLY" | "HYBRID";
}

interface ServicePromotion {
  discountPercentage: number;
  discountedPriceCents: number;
}

interface PrestationsSectionProps {
  services: Service[];
  servicePromotions?: Record<string, ServicePromotion>;
}

export function PrestationsSection({ services, servicePromotions = {} }: PrestationsSectionProps) {
  const handleSelectService = (serviceId: string) => {
    // Dispatch custom event to select service in booking widget
    const event = new CustomEvent("selectService", { detail: serviceId });
    window.dispatchEvent(event);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2) + "€";
  };

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#f7f7f7] overflow-hidden">
      {services.map((service, index) => {
        const promo = servicePromotions[service.id];
        const hasPromo = !!promo && promo.discountPercentage > 0;
        const displayPrice = hasPromo ? promo.discountedPriceCents : service.priceCents;
        return (
          <div
            key={service.id}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 ${
              index < services.length - 1 ? "border-b border-sable/30" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h3 className="font-semibold text-anthracite">
                  {service.name}
                </h3>
                {hasPromo && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#e67e22]/10 text-[#e67e22] text-xs font-semibold">
                    -{promo.discountPercentage}%
                  </span>
                )}
                {service.locationType === "VIDEO_ONLY" && (
                  <span className="px-2 py-0.5 bg-[#9bb49b]/10 text-[#9bb49b] text-xs font-semibold rounded-full">
                    Visio uniquement
                  </span>
                )}
                {service.locationType === "HYBRID" && (
                  <span className="px-2 py-0.5 bg-[#9bb49b]/10 text-[#9bb49b] text-xs font-semibold rounded-full">
                    Visio possible
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-anthracite/70">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{formatDuration(service.durationMin)}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasPromo && (
                  <span className="text-sm text-slate-400 line-through">
                    {formatPrice(service.priceCents)}
                  </span>
                )}
                <span className={`text-lg font-bold ${hasPromo ? "text-[#e67e22]" : "text-sauge"}`}>
                  {formatPrice(displayPrice)}
                </span>
              </div>
              <Button
                onClick={() => handleSelectService(service.id)}
                size="sm"
                className="bg-sauge hover:bg-sauge-dark text-white rounded-full px-4 w-full sm:w-auto"
              >
                Choisir
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

