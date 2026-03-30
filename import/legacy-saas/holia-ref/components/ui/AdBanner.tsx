"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: string;
  dataFullWidthResponsive?: boolean;
  isPremium?: boolean;
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-5132226059892334";

export function AdBanner({
  dataAdSlot,
  dataAdFormat = "auto",
  dataFullWidthResponsive = true,
  isPremium = false,
}: AdBannerProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return;

    // Anti-double render : ne pas recharger si Google a déjà traité cette annonce (ex. React Strict Mode)
    if (ins.getAttribute("data-adsbygoogle-status") != null) return;
    if (pushedRef.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (e) {
      console.warn("[AdBanner] adsbygoogle push failed", e);
    }
  }, []);

  if (isPremium) return null;

  return (
    <div className="relative rounded-lg overflow-hidden border border-sable/30 bg-sable/5 min-h-[90px]">
      <span
        className="absolute top-1.5 right-2 text-[10px] text-gray-400 uppercase tracking-wide z-10"
        aria-hidden
      >
        Sponsorisé
      </span>
      <ins
        ref={insRef}
        className="adsbygoogle block"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive}
        style={{ display: "block" }}
      />
    </div>
  );
}
