"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Skeleton } from "@/components/ui";
import { useSubscribePremium } from "@/hooks/use-subscribe-premium";
import { useStripeOnboarding } from "@/hooks/use-stripe-onboarding";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface BillingTabProps {
  initialSubscriptionStatus: string;
  initialPlanType?: string | null;
}

function BillingTab({ initialSubscriptionStatus }: BillingTabProps) {
  const session = useSession();
  const data = session?.data;
  const { subscribe, loading: subscribing } = useSubscribePremium();
  const { startOnboarding, checkStatus, loading: onboardingLoading } = useStripeOnboarding();
  const [portalLoading, setPortalLoading] = useState(false);

  // Récupérer le statut de l'onboarding Stripe
  const { data: onboardingStatus } = useQuery({
    queryKey: ["stripeOnboardingStatus"],
    queryFn: checkStatus,
    refetchInterval: 5000, // Vérifier toutes les 5 secondes si en cours
  });

  // Récupérer les infos du produit Premium
  const { data: productData } = useQuery({
    queryKey: ["stripeProduct"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/products");
      if (!res.ok) throw new Error("Failed to fetch product");
      return res.json();
    },
  });

  // Récupérer le statut de l'abonnement du praticien
  const { data: practitionerData } = useQuery({
    queryKey: ["practitionerProfile"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  const subscriptionStatus = practitionerData?.subscriptionStatus || initialSubscriptionStatus || "free";
  const isPremium = subscriptionStatus === "active";
  const stripeOnboardingComplete = practitionerData?.stripeOnboardingComplete || false;

  const monthlyPrice = productData?.prices?.find((p: any) => p.interval === "month");
  const priceDisplay = monthlyPrice
    ? `${(monthlyPrice.amount / 100).toFixed(2)} €`
    : "59,00 €";

  if (session.status === 'loading') return <Skeleton />

  return (
    <div className="space-y-6">
      {/* Statut Stripe Connect */}
      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Paiements en ligne
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stripeOnboardingComplete ? (
            <div className="p-4 bg-[#9bb49b]/5 rounded-3xl border border-gray-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-anthracite">Paiements activés</p>
                  <p className="text-sm text-anthracite/60">
                    Vous pouvez accepter les paiements en ligne
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white rounded-3xl border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-anthracite">Paiements non configurés</p>
                  <p className="text-sm text-anthracite/60">
                    Activez les paiements en ligne pour recevoir les paiements de vos patients
                  </p>
                </div>
              </div>
              <Button
                onClick={startOnboarding}
                disabled={onboardingLoading}
                className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl"
              >
                {onboardingLoading ? "Chargement..." : "Activer les paiements en ligne"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Abonnement Premium */}
      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Abonnement Holia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan Actuel */}
          <div
            className={`p-6 rounded-3xl border-2 ${
              isPremium ? "bg-[#9bb49b]/5 border-gray-100" : "bg-gray-50 border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {isPremium ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <p className="font-semibold text-anthracite text-lg">
                    {isPremium ? "Plan Premium" : "Plan Freemium"}
                  </p>
                </div>
                <p className="text-sm text-anthracite/60">
                  {isPremium
                    ? "Accès complet à toutes les fonctionnalités - 0% de commission"
                    : "Plan gratuit avec commission sur les réservations"}
                </p>
              </div>
              <div className="text-right">
                {isPremium ? (
                  <>
                    <p className="text-2xl font-bold text-green-600">{priceDisplay}</p>
                    <p className="text-sm text-anthracite/60">/ mois</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-anthracite">Gratuit</p>
                    <p className="text-sm text-anthracite/60">avec commission</p>
                  </>
                )}
              </div>
            </div>
            {isPremium ? (
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-anthracite">Abonnement actif</span>
                  </div>
                  <p className="text-sm text-anthracite/60">
                    Vous ne payez aucune commission sur les réservations
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  disabled={portalLoading}
                  onClick={async () => {
                    setPortalLoading(true);
                    try {
                      const res = await fetch("/api/stripe/customer-portal", {
                        method: "POST",
                      });
                      const json = await res.json();
                      if (!res.ok) {
                        alert(json.error || "Impossible d’ouvrir le portail de gestion.");
                        return;
                      }
                      if (json.url) window.location.href = json.url;
                    } catch {
                      alert("Erreur lors de l’ouverture du portail.");
                    } finally {
                      setPortalLoading(false);
                    }
                  }}
                >
                  {portalLoading ? "Ouverture du portail..." : "Gérer l'abonnement"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={subscribe}
                disabled={subscribing || !stripeOnboardingComplete}
                className="w-full bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl"
              >
                {subscribing
                  ? "Chargement..."
                  : !stripeOnboardingComplete
                  ? "Activez d'abord les paiements"
                  : "S'abonner au Plan Premium"}
              </Button>
            )}
          </div>

          {!isPremium && (
            <div className="p-4 bg-gray-50 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-anthracite mb-2">Avantages du Plan Premium :</p>
              <ul className="text-sm text-anthracite/70 space-y-1 list-disc list-inside">
                <li>0% de commission sur les réservations</li>
                <li>Accès à toutes les fonctionnalités</li>
                <li>Support prioritaire</li>
                <li>Statistiques avancées</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BillingTab;

