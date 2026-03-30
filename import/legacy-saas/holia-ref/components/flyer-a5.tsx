"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Search, Calendar, Shield, CalendarDays, FileText, Link2, CreditCard } from "lucide-react";

const A5_W = 148;
const A5_H = 210;
const SAGE = "#9bb49b";
const PAD_MM = 18;
const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "Inter, sans-serif";

const pageStyle: React.CSSProperties = {
  width: `${A5_W}mm`,
  height: `${A5_H}mm`,
  overflow: "hidden",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  padding: `${PAD_MM}mm`,
  boxSizing: "border-box",
  printColorAdjust: "exact",
  backgroundColor: "#fdfdfc",
};

/** Blobs organiques sauge 10% dans les coins */
function BlobDecoration() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      <div
        className="absolute -top-8 -left-8 w-24 h-24 rounded-full blur-2xl"
        style={{ backgroundColor: SAGE, opacity: 0.1, printColorAdjust: "exact" }}
      />
      <div
        className="absolute -top-12 right-0 w-20 h-20 rounded-full blur-2xl"
        style={{ backgroundColor: SAGE, opacity: 0.1, printColorAdjust: "exact" }}
      />
      <div
        className="absolute bottom-0 -left-6 w-20 h-20 rounded-full blur-2xl"
        style={{ backgroundColor: SAGE, opacity: 0.1, printColorAdjust: "exact" }}
      />
      <div
        className="absolute -bottom-8 right-0 w-28 h-28 rounded-full blur-2xl"
        style={{ backgroundColor: SAGE, opacity: 0.1, printColorAdjust: "exact" }}
      />
    </div>
  );
}

function FlyerContent() {
  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          RECTO — Patient — "L'Émotion" (composition en Z)
      ═══════════════════════════════════════════════════════════════ */}
      <div
        id="recto"
        className="flyer-recto"
        style={{ ...pageStyle, pageBreakAfter: "always" }}
      >
        <BlobDecoration />

        <div className="relative z-10 flex flex-col flex-1 min-h-0 gap-6" style={{ boxSizing: "border-box" }}>
          {/* Z - Top: Hero */}
          <div className="shrink-0 text-center">
            <img
              src="/images/logo-h-green.webp"
              alt="Holia"
              className="h-8 w-auto object-contain mx-auto mb-3"
              style={{ printColorAdjust: "exact" }}
            />
            <h1
              className="text-[2rem] font-semibold text-anthracite text-center leading-[1.15]"
              style={{ fontFamily: SERIF }}
            >
              Votre sérénité
              <br />
              commence ici.
            </h1>
            <p
              className="text-anthracite/70 text-xs mt-3 max-w-[110mm] mx-auto leading-relaxed"
              style={{ fontFamily: SANS }}
            >
              Découvrez la première cartographie éthique du bien-être en France.
            </p>
          </div>

          {/* Z - Middle: Petites cartes (Search, Calendar, Shield) */}
          <div className="shrink-0 grid grid-cols-1 gap-3">
            <div
              className="rounded-2xl border bg-white/90 p-3 flex items-start gap-3"
              style={{ borderColor: "rgba(155,180,155,0.25)", borderWidth: "1px", printColorAdjust: "exact" }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: SAGE, printColorAdjust: "exact" }}>
                <Search className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-anthracite font-medium text-xs" style={{ fontFamily: SANS }}>Recherche locale</p>
                <p className="text-anthracite/70 text-[11px] leading-snug mt-0.5" style={{ fontFamily: SANS }}>70 000 praticiens vérifiés via l&apos;INSEE.</p>
              </div>
            </div>
            <div
              className="rounded-2xl border bg-white/90 p-3 flex items-start gap-3"
              style={{ borderColor: "rgba(155,180,155,0.25)", borderWidth: "1px", printColorAdjust: "exact" }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: SAGE, printColorAdjust: "exact" }}>
                <Calendar className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-anthracite font-medium text-xs" style={{ fontFamily: SANS }}>Réservation 24/7</p>
                <p className="text-anthracite/70 text-[11px] leading-snug mt-0.5" style={{ fontFamily: SANS }}>Réservez en un clic, sans compte obligatoire.</p>
              </div>
            </div>
            <div
              className="rounded-2xl border bg-white/90 p-3 flex items-start gap-3"
              style={{ borderColor: "rgba(155,180,155,0.25)", borderWidth: "1px", printColorAdjust: "exact" }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: SAGE, printColorAdjust: "exact" }}>
                <Shield className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-anthracite font-medium text-xs" style={{ fontFamily: SANS }}>Sécurisé & éthique</p>
                <p className="text-anthracite/70 text-[11px] leading-snug mt-0.5" style={{ fontFamily: SANS }}>Charte éthique et données hébergées en Europe.</p>
              </div>
            </div>
          </div>

          {/* Z - Bottom: QR bloc élégant, ombre diffuse */}
          <div className="shrink-0 flex flex-col items-center mt-auto pt-2">
            <div
              className="rounded-3xl border bg-white p-4"
              style={{
                borderColor: "rgba(155,180,155,0.2)",
                borderWidth: "1px",
                printColorAdjust: "exact",
                boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
              }}
            >
              <QRCodeSVG
                value="https://holia.me?utm_source=flyer&utm_medium=print"
                size={100}
                level="M"
                bgColor="#ffffff"
                fgColor="#2F2F2F"
                className="rounded-2xl"
              />
            </div>
            <p className="text-anthracite/70 text-xs mt-2 font-medium tracking-wide" style={{ fontFamily: SANS, letterSpacing: "0.04em" }}>
              Trouvez votre praticien près de chez vous
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          VERSO — Praticien — "La Solution"
      ═══════════════════════════════════════════════════════════════ */}
      <div
        id="verso"
        className="flyer-verso"
        style={{ ...pageStyle, pageBreakAfter: "auto" }}
      >
        <BlobDecoration />

        {/* Bandeau vert sauge — accroche */}
        <header
          className="shrink-0 py-4 px-4 text-center rounded-2xl mb-4"
          style={{ backgroundColor: SAGE, printColorAdjust: "exact" }}
        >
          <h2
            className="text-xl font-semibold text-white leading-tight"
            style={{ fontFamily: SERIF }}
          >
            Libérez votre temps.
            <br />
            Soignez vos patients.
          </h2>
        </header>

        <div className="relative z-10 flex flex-col flex-1 min-h-0 gap-4" style={{ boxSizing: "border-box" }}>
          {/* Le mot du fondateur */}
          <div
            className="shrink-0 rounded-2xl border p-3 bg-white/80"
            style={{ borderColor: "rgba(155,180,155,0.3)", borderWidth: "1px", printColorAdjust: "exact" }}
          >
            <p className="text-[10px] font-semibold text-anthracite/80 uppercase tracking-wider mb-1.5" style={{ fontFamily: SANS }}>Le mot du fondateur</p>
            <p className="text-anthracite text-xs leading-relaxed italic" style={{ fontFamily: SERIF }}>
              &laquo; J&apos;ai créé Holia pour ma belle-mère, praticienne passionnée, pour qu&apos;elle puisse enfin oublier l&apos;administratif. &raquo;
            </p>
          </div>

          {/* Grille 4 blocs */}
          <div className="shrink-0 grid grid-cols-2 gap-2">
            {[
              { icon: CalendarDays, label: "Agenda intelligent" },
              { icon: FileText, label: "Facturation auto" },
              { icon: Link2, label: "Lien DoFollow (SEO)" },
              { icon: CreditCard, label: "0€ d'abonnement" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-xl border p-2.5 flex items-center gap-2 bg-white/90"
                style={{ borderColor: "rgba(155,180,155,0.25)", borderWidth: "1px", printColorAdjust: "exact" }}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: SAGE, printColorAdjust: "exact" }}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="text-anthracite text-[11px] font-medium" style={{ fontFamily: SANS }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Carte centrale Zéro Risque */}
          <div
            className="shrink-0 rounded-2xl border-2 p-4 bg-white"
            style={{ borderColor: SAGE, printColorAdjust: "exact" }}
          >
            <p className="text-xs font-bold text-anthracite uppercase tracking-wider mb-2" style={{ fontFamily: SANS }}>Zéro Risque</p>
            <p className="text-anthracite text-sm leading-relaxed" style={{ fontFamily: SANS }}>
              Si vous ne gagnez rien, Holia ne facture rien. 8% de commission plafonné à 59€/mois.
            </p>
          </div>

          {/* Spacer pour pousser le footer */}
          <div className="flex-1 min-h-2" />
        </div>

        {/* Bandeau noir fin — footer */}
        <footer
          className="shrink-0 py-2 px-4 text-center rounded-b-2xl mt-auto"
          style={{ backgroundColor: "#1a1a1a", printColorAdjust: "exact" }}
        >
          <p className="text-white/90 text-[9px] font-medium" style={{ fontFamily: SANS }}>
            Holia.me — Développé avec ❤️ à Idron (64)
          </p>
        </footer>
      </div>
    </>
  );
}

export function FlyerA5() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div id="flyer-final" className="flyer-final-only" aria-hidden="true">
      <FlyerContent />
    </div>,
    document.body
  );
}
