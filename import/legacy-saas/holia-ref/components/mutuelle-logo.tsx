"use client";

import { useState } from "react";

/** Mapping nom mutuelle → domaine (Google favicons) */
const MUTUELLE_DOMAINS: Record<string, string> = {
  axa: "axa.fr",
  alan: "alan.com",
  april: "april.fr",
  "malakoff humanis": "malakoffhumanis.com",
  malakoff: "malakoffhumanis.com",
  humanis: "malakoffhumanis.com", 
  "harmonie mutuelle": "harmonie-mutuelle.fr",
  harmonie: "harmonie-mutuelle.fr",
  "swiss life": "swisslife.fr",
  swisslife: "swisslife.fr",
  matmut: "matmut.fr",
  groupama: "groupama.fr",
  maaf: "maaf.fr",
  mma: "mma.fr",
  generali: "generali.fr",
};

/** Couleurs de marque pour le fallback (première lettre) */
const MUTUELLE_COLORS: Record<string, string> = {
  axa: "#00008f",
  alan: "#00d395",
  april: "#f15a24",
  "malakoff humanis": "#e30613",
  malakoff: "#e30613",
  "harmonie mutuelle": "#00a651",
  harmonie: "#00a651",
  "swiss life": "#e30613",
  swisslife: "#e30613",
  matmut: "#003366",
  groupama: "#00a651",
  maaf: "#0054a6",
  mma: "#e30613",
  generali: "#e30613",
};

const SAGE_GREEN = "#9bb49b";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeMutuelleName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getDomain(name: string): string | null {
  const normalized = normalizeMutuelleName(name);
  return MUTUELLE_DOMAINS[normalized] ?? null;
}

function getFallbackColor(name: string): string {
  const normalized = normalizeMutuelleName(name);
  return MUTUELLE_COLORS[normalized] ?? SAGE_GREEN;
}

function getFirstLetter(name: string): string {
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() || "?";
}

interface MutuelleLogoProps {
  name: string;
  size?: 80 | 64 | 96;
  className?: string;
  /** Si true, logo en grayscale par défaut, couleur au hover du parent (group). Par défaut true pour les grilles. */
  grayscaleOnHover?: boolean;
}

export function MutuelleLogo({
  name,
  size = 80,
  className = "",
  grayscaleOnHover = true,
}: MutuelleLogoProps) {
  const [imgError, setImgError] = useState(false);
  const domain = getDomain(name);
  const fallbackColor = getFallbackColor(name);
  const firstLetter = getFirstLetter(name);

  const showFallback = imgError || !domain;
  const logoUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(`https://www.${domain}`)}&sz=128`
    : null;

  const grayscaleClass = grayscaleOnHover ? "grayscale group-hover:grayscale-0" : "";
  const fallbackBg = hexToRgba(fallbackColor, 0.1);

  return (
    <div
      className={`flex items-center justify-center shrink-0 transition-all ${grayscaleClass} ${className}`}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-bold"
          style={{
            backgroundColor: fallbackBg,
            color: fallbackColor,
            fontSize: size * 0.45,
          }}
        >
          {firstLetter}
        </div>
      ) : (
        <div className="w-full h-full rounded-xl overflow-hidden bg-white flex items-center justify-center p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl!}
            alt={`Logo ${name}`}
            className="object-contain w-full h-full"
            onError={() => setImgError(true)}
          />
        </div>
      )}
    </div>
  );
}
