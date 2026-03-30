"use client";

import { useState, useEffect } from "react";
import { Cookie, CheckCircle2, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui";

export default function CookiesPage() {
  const [preferences, setPreferences] = useState({
    essential: true, // Toujours activé, pas modifiable
    analytics: false,
    marketing: false,
  });
  const [saved, setSaved] = useState(false);
  const [currentConsent, setCurrentConsent] = useState<string | null>(null);

  useEffect(() => {
    // Charger les préférences actuelles
    const consent = localStorage.getItem("holia_cookie_consent");
    setCurrentConsent(consent);
    
    if (consent === "accepted") {
      setPreferences({
        essential: true,
        analytics: true,
        marketing: false,
      });
    }
  }, []);

  const handleSave = () => {
    if (preferences.analytics) {
      localStorage.setItem("holia_cookie_consent", "accepted");
      localStorage.setItem("holia_cookie_consent_date", Date.now().toString());
      // Charger les analytics
      loadAnalytics();
    } else {
      localStorage.setItem("holia_cookie_consent", "declined");
      localStorage.setItem("holia_cookie_consent_date", Date.now().toString());
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const loadAnalytics = () => {
    if (typeof window !== "undefined" && !(window as any).googleAnalyticsLoaded) {
      // TODO: Ajouter le code Google Analytics ici
      (window as any).googleAnalyticsLoaded = true;
    }
  };

  const handleAcceptAll = () => {
    setPreferences({
      essential: true,
      analytics: true,
      marketing: false,
    });
  };

  const handleRejectAll = () => {
    setPreferences({
      essential: true,
      analytics: false,
      marketing: false,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-sauge/5 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-anthracite/10 p-8 md:p-12">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-sauge/10 p-3 rounded-xl">
              <Cookie className="h-8 w-8 text-sauge" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-anthracite">
                Gestion des cookies
              </h1>
              <p className="text-anthracite/60 mt-1">
                Personnalisez vos préférences de cookies
              </p>
            </div>
          </div>

          {/* Message de confirmation */}
          {saved && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">
                Vos préférences ont été enregistrées avec succès !
              </p>
            </div>
          )}

          {/* Statut actuel */}
          <div className="mb-8 p-4 bg-anthracite/5 rounded-xl">
            <p className="text-sm text-anthracite/70">
              <strong>Statut actuel :</strong>{" "}
              {currentConsent === "accepted" ? (
                <span className="text-green-600 font-medium">
                  Cookies acceptés
                </span>
              ) : currentConsent === "declined" ? (
                <span className="text-orange-600 font-medium">
                  Cookies refusés (sauf essentiels)
                </span>
              ) : (
                <span className="text-anthracite/60 font-medium">
                  Aucune préférence enregistrée
                </span>
              )}
            </p>
          </div>

          {/* Boutons rapides */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Button
              onClick={handleAcceptAll}
              className="flex-1 bg-sauge hover:bg-sauge/90 text-white"
            >
              Tout accepter
            </Button>
            <Button
              onClick={handleRejectAll}
              variant="outline"
              className="flex-1 border-anthracite/20 hover:bg-anthracite/5"
            >
              Tout refuser (sauf essentiels)
            </Button>
          </div>

          {/* Catégories de cookies */}
          <div className="space-y-6">
            {/* Cookies essentiels */}
            <div className="border border-anthracite/10 rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-anthracite">
                      Cookies essentiels
                    </h3>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Toujours actifs
                    </span>
                  </div>
                  <p className="text-sm text-anthracite/70 leading-relaxed">
                    Ces cookies sont nécessaires au fonctionnement du site. 
                    Ils permettent l'authentification, la sécurité des paiements et 
                    la protection contre les attaques.
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-anthracite/50">
                      <strong>Exemples :</strong> Session NextAuth, Stripe (sécurité paiements), CSRF Token
                    </p>
                    <p className="text-xs text-anthracite/50">
                      <strong>Durée :</strong> Session ou 30 jours
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Cookies analytics */}
            <div className="border border-anthracite/10 rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-anthracite">
                      Cookies de statistiques
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      Optionnel
                    </span>
                  </div>
                  <p className="text-sm text-anthracite/70 leading-relaxed">
                    Ces cookies nous aident à comprendre comment vous utilisez Holia 
                    pour améliorer votre expérience. Les données sont anonymisées.
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-anthracite/50">
                      <strong>Exemples :</strong> Google Analytics (_ga, _gid)
                    </p>
                    <p className="text-xs text-anthracite/50">
                      <strong>Durée :</strong> 2 ans (GA), 24h (_gid)
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-anthracite/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sauge/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sauge"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Cookies marketing (désactivé pour le moment) */}
            <div className="border border-anthracite/10 rounded-xl p-6 opacity-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-anthracite">
                      Cookies marketing
                    </h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      Non utilisé
                    </span>
                  </div>
                  <p className="text-sm text-anthracite/70 leading-relaxed">
                    Nous n'utilisons pas de cookies marketing ni publicitaires. 
                    Cette catégorie est désactivée par principe.
                  </p>
                </div>
                <div className="ml-4">
                  <XCircle className="h-6 w-6 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Info supplémentaire */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Vos données, votre contrôle</p>
              <p className="text-blue-700">
                Vous pouvez modifier ces préférences à tout moment. 
                Pour en savoir plus sur notre utilisation des cookies, 
                consultez notre{" "}
                <a href="/fr/privacy" className="underline hover:text-blue-900">
                  politique de confidentialité
                </a>.
              </p>
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <div className="mt-8">
            <Button
              onClick={handleSave}
              size="lg"
              className="w-full bg-sauge hover:bg-sauge/90 text-white font-medium"
            >
              Enregistrer mes préférences
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

