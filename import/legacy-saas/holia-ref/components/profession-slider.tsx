"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Leaf, Waves, Brain, Bone, Hand, Activity, Heart, Target, Sparkles, Flower, Moon, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import Image from "next/image";

// Mapping des noms d'icônes vers les composants
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Leaf,
  Waves,
  Brain,
  Bone,
  Hand,
  Activity,
  Heart,
  Target,
  Sparkles,
  Flower,
  Moon,
  Shield,
};

interface ProfessionSlide {
  id: string;
  title: string;
  description: string;
  seoText?: string;
  images: string[];
  imageAlts?: string[]; // Metadescriptions pour chaque image
  link: string;
  iconName?: string; // Nom de l'icône (ex: "Leaf", "Waves", etc.)
}

interface ProfessionSliderProps {
  professions: ProfessionSlide[];
  autoSlideInterval?: number; // in milliseconds
}

export function ProfessionSlider({ professions, autoSlideInterval = 5000 }: ProfessionSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Reset progress when slide changes
  useEffect(() => {
    setProgress(0);
    startTimeRef.current = Date.now();
  }, [currentIndex, isPaused]);

  // Progress bar animation
  useEffect(() => {
    if (!isPaused && professions.length > 1) {
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min((elapsed / autoSlideInterval) * 100, 100);
        setProgress(newProgress);
      }, 50); // Update every 50ms for smooth animation
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPaused, currentIndex, autoSlideInterval, professions.length]);

  // Auto slide
  useEffect(() => {
    if (!isPaused && professions.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % professions.length);
        setDirection("right");
      }, autoSlideInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, professions.length, autoSlideInterval]);

  const goToSlide = (index: number) => {
    const newDirection = index > currentIndex ? "right" : "left";
    setDirection(newDirection);
    setCurrentIndex(index);
    setIsPaused(true);
    setProgress(0);
    startTimeRef.current = Date.now();
    // Resume auto-slide after 10 seconds
    setTimeout(() => setIsPaused(false), 10000);
  };

  const goToPrevious = () => {
    setDirection("left");
    goToSlide((currentIndex - 1 + professions.length) % professions.length);
  };

  const goToNext = () => {
    setDirection("right");
    goToSlide((currentIndex + 1) % professions.length);
  };

  const currentProfession = professions[currentIndex];

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Mobile / tablette : défilement horizontal au doigt (scroll-snap) */}
      <div className="lg:hidden overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth touch-pan-x overscroll-x-contain pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="flex gap-4 sm:gap-6" style={{ width: "max-content" }}>
          {professions.map((profession, idx) => (
            <div
              key={profession.id}
              className="w-[85vw] sm:w-[75vw] flex-shrink-0 snap-center snap-always"
              style={{ minWidth: "min(85vw, 380px)" }}
            >
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col h-full">
                <div className="relative h-48 sm:h-56 flex-shrink-0">
                  {profession.images[0] && (
                    <Image
                      src={profession.images[0]}
                      alt={profession.title}
                      fill
                      className="object-cover"
                      sizes="85vw"
                    />
                  )}
                </div>
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  {profession.iconName && iconMap[profession.iconName] && (
                    <div className="mb-3">
                      <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-full flex items-center justify-center">
                        {React.createElement(iconMap[profession.iconName], { className: "h-6 w-6 text-[#9bb49b]" })}
                      </div>
                    </div>
                  )}
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-anthracite mb-2">{profession.title}</h3>
                  <p className="text-anthracite/70 text-sm sm:text-base line-clamp-3 flex-1">{profession.description}</p>
                  <Button asChild variant="saugeFill" size="sm" className="mt-4 w-fit">
                    <Link href={profession.link}>
                      <span className="relative z-10 flex items-center gap-2">
                        Voir plus
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop : slider actuel avec une slide visible + flèches */}
      <div className="hidden lg:block relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Images Section */}
          <div className="relative h-80 lg:h-[600px] p-2 lg:p-4 overflow-hidden">
            {professions.map((profession, professionIdx) => (
              <div
                key={professionIdx}
                className={`absolute inset-0 p-2 lg:p-4 transition-all duration-700 ease-in-out ${
                  professionIdx === currentIndex
                    ? "opacity-100 translate-x-0"
                    : professionIdx < currentIndex
                    ? "opacity-0 -translate-x-full"
                    : "opacity-0 translate-x-full"
                }`}
              >
                {profession.images.length === 1 ? (
                  <div className="relative w-full h-full rounded-2xl overflow-hidden">
                    <Image
                      src={profession.images[0]}
                      alt={profession.title}
                      fill
                      className="object-cover"
                      priority={professionIdx === 0}
                      loading={professionIdx === 0 ? undefined : "lazy"}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 lg:gap-4 h-full">
                    {profession.images.slice(0, 2).map((image, idx) => (
                      <div
                        key={idx}
                        className="relative w-full h-full rounded-2xl overflow-hidden"
                      >
                        <Image
                          src={image}
                          alt={profession.imageAlts?.[idx] || `${profession.title} - Image ${idx + 1}`}
                          fill
                          className="object-cover"
                          priority={professionIdx === 0 && idx === 0}
                          loading={professionIdx === 0 && idx === 0 ? undefined : "lazy"}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Text Section */}
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <div
              key={currentIndex}
              className="animate-fadeIn"
              style={{
                animation: "fadeIn 0.5s ease-in-out",
              }}
            >
              {/* Icon */}
              {currentProfession.iconName && iconMap[currentProfession.iconName] && (
                <div className="mb-6">
                  <div className="w-16 h-16 bg-[#9bb49b]/10 rounded-full flex items-center justify-center">
                    {React.createElement(iconMap[currentProfession.iconName], { className: "h-8 w-8 text-[#9bb49b]" })}
                  </div>
                </div>
              )}
              <h3 className="text-3xl md:text-4xl font-bold font-heading text-anthracite mb-4">
                {currentProfession.title}
              </h3>
              <div className="w-16 h-1 bg-sauge mb-6"></div>
              <p className="text-lg text-anthracite/70 mb-4 leading-relaxed">
                {currentProfession.description}
              </p>
              {currentProfession.seoText && (
                <p className="text-base text-anthracite/60 mb-8 leading-relaxed">
                  {currentProfession.seoText}
                </p>
              )}
              <Button asChild variant="saugeFill" className="w-fit">
                <Link href={currentProfession.link}>
                  <span className="relative z-10 flex items-center gap-2">
                    Voir plus
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </Button>
            </div>

            {/* Dots Indicator with Progress Bar - Under Text */}
            {professions.length > 1 && (
              <div className="flex gap-2 mt-8 justify-center lg:justify-start">
                {professions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className="relative h-2 rounded-full transition-all group"
                    aria-label={`Aller au slide ${index + 1}`}
                  >
                    {index === currentIndex ? (
                      <div className="relative h-2 w-12 bg-sable/20 rounded-full overflow-hidden">
                        {/* Background bar (always visible) */}
                        <div className="absolute inset-0 bg-sauge/20 rounded-full" />
                        {/* Progress bar filling */}
                        <div
                          className={`absolute top-0 left-0 h-full bg-sauge rounded-full transition-all ${
                            isPaused ? "opacity-60" : "opacity-100"
                          }`}
                          style={{
                            width: `${progress}%`,
                            transitionDuration: isPaused ? "0ms" : "50ms",
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-2 w-2 bg-sable/30 hover:bg-sable/50 rounded-full transition-all" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Arrows */}
        {professions.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-sable/30 flex items-center justify-center shadow-lg transition-all z-10"
              aria-label="Slide précédent"
            >
              <ChevronLeft className="h-5 w-5 text-anthracite" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-sable/30 flex items-center justify-center shadow-lg transition-all z-10"
              aria-label="Slide suivant"
            >
              <ChevronRight className="h-5 w-5 text-anthracite" />
            </button>
          </>
        )}
      </div>

    </div>
  );
}
