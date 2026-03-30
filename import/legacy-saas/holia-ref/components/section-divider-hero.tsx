"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/**
 * Séparateur SVG entre Hero et section suivante (Catégories).
 * Courbe douce asymétrique, couleur = fond de la section suivante (blanc).
 * Responsive : hauteur réduite sur mobile. Animation "déplier" au scroll.
 */
export function SectionDividerHero() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <div ref={ref} className="relative w-full leading-[0]">
      <motion.div
        className="w-full"
        initial={{ opacity: 0.7, scaleY: 0.92 }}
        animate={isInView ? { opacity: 1, scaleY: 1 } : {}}
        transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ transformOrigin: "center top" }}
      >
        {/* Courbe asymétrique : plus douce sur mobile (h-10), plus marquée sur desktop (h-16 lg:h-24) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          className="w-full h-10 sm:h-12 md:h-16 lg:h-20 xl:h-24 block"
          aria-hidden
        >
          {/* Fill = fond de la section suivante (blanc) pour transition invisible */}
          <path
            fill="#ffffff"
            d="M0,96 L0,48 C240,12 400,72 720,36 C960,8 1120,60 1440,42 L1440,96 Z"
          />
        </svg>
      </motion.div>
    </div>
  );
}
