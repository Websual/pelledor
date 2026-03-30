"use client";

import { useEffect } from "react";

/**
 * Hook pour gérer le consentement des cookies et le chargement conditionnel d'Analytics
 * Respecte le RGPD : ne charge les scripts de tracking QUE si l'utilisateur a accepté
 */
export function useAnalytics() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const consent = localStorage.getItem("holia_cookie_consent");
    
    // Charger les analytics uniquement si accepté
    if (consent === "accepted" && !(window as any).googleAnalyticsLoaded) {
      loadGoogleAnalytics();
    }
  }, []);
}

function loadGoogleAnalytics() {
  if (typeof window === "undefined") return;
  if ((window as any).googleAnalyticsLoaded) return;

  // TODO: Remplacer G-XXXXXXXXXX par votre vrai ID Google Analytics
  // const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX";
  
  // const script = document.createElement("script");
  // script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  // script.async = true;
  // document.body.appendChild(script);

  // script.onload = () => {
  //   (window as any).dataLayer = (window as any).dataLayer || [];
  //   function gtag(...args: any[]) {
  //     (window as any).dataLayer.push(args);
  //   }
  //   gtag("js", new Date());
  //   gtag("config", GA_ID);
  // };

  (window as any).googleAnalyticsLoaded = true;
  console.log("[Analytics] Google Analytics chargé après consentement");
}

/**
 * Helper pour vérifier si l'utilisateur a donné son consentement
 */
export function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("holia_cookie_consent") === "accepted";
}

/**
 * Helper pour suivre un événement (uniquement si consentement donné)
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (!hasConsent()) return;
  
  // TODO: Implémenter le tracking d'événements
  // if ((window as any).gtag) {
  //   (window as any).gtag("event", eventName, params);
  // }
  
  console.log("[Analytics] Event:", eventName, params);
}

