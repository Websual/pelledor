"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Vérifie si l'utilisateur a déjà répondu
    const consent = localStorage.getItem("holia_cookie_consent");
    const consentDate = localStorage.getItem("holia_cookie_consent_date");

    // Si pas de consentement OU consentement de plus de 6 mois, on redemande
    if (!consent || (consentDate && Date.now() - parseInt(consentDate) > 6 * 30 * 24 * 60 * 60 * 1000)) {
      // Délai de 2 secondes pour ne pas agresser l'utilisateur dès l'arrivée
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    } else if (consent === "accepted") {
      // Si déjà accepté, charger les analytics (à implémenter plus tard)
      loadAnalytics();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("holia_cookie_consent", "accepted");
    localStorage.setItem("holia_cookie_consent_date", Date.now().toString());
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      loadAnalytics();
    }, 300);
  };

  const handleDecline = () => {
    localStorage.setItem("holia_cookie_consent", "declined");
    localStorage.setItem("holia_cookie_consent_date", Date.now().toString());
    setIsClosing(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  // Fonction pour charger Google Analytics ou autres outils de tracking
  const loadAnalytics = () => {
    // Éviter de charger deux fois
    if (typeof window !== "undefined" && (window as any).googleAnalyticsLoaded) return;

    // TODO: Ajouter ici le code Google Analytics quand disponible
    // const script = document.createElement("script");
    // script.src = `https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`;
    // script.async = true;
    // document.body.appendChild(script);

    if (typeof window !== "undefined") {
      (window as any).googleAnalyticsLoaded = true;
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] max-w-md transition-all duration-300 ${
        isClosing ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border border-anthracite/10 shadow-2xl rounded-2xl p-6 relative overflow-hidden">
        {/* Décoration en arrière-plan */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-sauge/5 rounded-full -translate-y-16 translate-x-16" />
        
        {/* Icône cookie avec couleur Sauge */}
        <div className="absolute top-2 right-2 bg-sauge text-white p-2.5 rounded-full shadow-lg">
          <Cookie size={20} strokeWidth={2.5} />
        </div>

        {/* Contenu */}
        <div className="relative">
          <h3 className="text-anthracite font-semibold text-lg mb-2 text-left">
            Un petit cookie ? 🍪
          </h3>
          
          <p className="text-anthracite/70 text-sm mb-4 leading-relaxed">
            Nous utilisons des cookies uniquement pour comprendre comment vous utilisez Holia 
            et améliorer votre expérience. Pas de publicité, promis. 🌿
          </p>

          {/* Lien vers la politique de confidentialité */}
          <p className="text-xs text-anthracite/50 mb-4">
            En savoir plus :{" "}
            <a 
              href="/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sauge hover:underline"
            >
              Politique de confidentialité
            </a>
          </p>

          {/* Boutons */}
          <div className="flex flex-col gap-2.5">
            <button 
              onClick={handleAccept}
              className="w-full bg-sauge hover:bg-sauge/90 text-white font-medium py-3 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] transform duration-100"
            >
              Accepter et continuer
            </button>
            
            <button 
              onClick={handleDecline}
              className="w-full bg-transparent hover:bg-anthracite/5 text-anthracite/70 hover:text-anthracite text-sm font-medium py-2.5 rounded-xl transition-all border border-anthracite/10"
            >
              Continuer sans accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

