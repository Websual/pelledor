"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HomeSearchBar } from "@/components/home-search-bar";

const BACKGROUND_IMAGES = [
  "/images/hero/hero-equilibre-mental.webp",
  "/images/hero/hero-harmonie-globale.webp",
  "/images/hero/hero-meditation.webp",
  "/images/hero/hero-naturopathie.webp",
  "/images/hero/hero-therapie.webp",
  "/images/hero/hero-wellness.webp",
];

export function HeroSection() {
  const [backgroundImage, setBackgroundImage] = useState(BACKGROUND_IMAGES[0]);

  useEffect(() => {
    const idx = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
    setBackgroundImage(BACKGROUND_IMAGES[idx] ?? BACKGROUND_IMAGES[0]);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-20 md:pt-32 md:pb-32 bg-white overflow-visible">
      {/* Background Image with Light Overlay */}
      <div className="absolute inset-0 z-0">
        <motion.div
          key={backgroundImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <Image
              src={backgroundImage}
              alt="Bien-être holistique et local"
              fill
              className="object-cover"
              style={{ objectPosition: "center 60%" }}
              priority
              quality={90}
              sizes="100vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-white/50 z-10 pointer-events-none" />
      </div>

      {/* Arrondi blanc : courbe concave (section blanche qui "remonte" / scoop comme Podia) */}
      <div className="absolute bottom-0 left-0 right-0 z-10 w-full pointer-events-none" aria-hidden>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="w-full h-16 sm:h-20 md:h-28 lg:h-36 block"
        >
          {/* Forme blanche : bord supérieur = courbe concave (creux au centre) */}
          <path
            fill="#ffffff"
            d="M0,120 L0,0 Q360,80 720,40 Q1080,0 1440,40 L1440,120 Z"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 flex-1 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-heading text-black leading-tight drop-shadow-sm">
            Votre Source de Bien-être Local et Holistique
          </h1>
          {/* Barre de recherche améliorée - z-30 pour que le dropdown passe au-dessus du texte ci-dessous */}
          <div className="pt-8 relative z-30">
            <HomeSearchBar />
          </div>
          <p className="text-xl md:text-2xl text-anthracite/80 max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
            Connectez-vous à une communauté de praticiens passionnés, près de chez vous.
          </p>
         
        </div>
      </div>
    </section>
  );
}

