"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Bell,
  Calendar,
  CreditCard,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Video,
  Gift,
} from "lucide-react";
import BillingTab from "./billing-tab";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ToastContainer, ToastType } from "@/components/toast";

type SettingsPageClientProps = {
  initialSubscriptionStatus: string;
  initialPlanType?: string | null;
};

export default function SettingsPageClient({
  initialSubscriptionStatus,
  initialPlanType,
}: SettingsPageClientProps) {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"notifications" | "billing" | "security" | "video" | "shop" | "calendar">("billing");
  const [videoLink, setVideoLink] = useState("");
  const [notifyNewAppointments, setNotifyNewAppointments] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReviews, setNotifyReviews] = useState(true);

  // Charger les settings
  const { data: settings } = useQuery({
    queryKey: ["practitionerSettings"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Charger le profil du praticien pour obtenir acceptsGiftCards
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["practitionerProfile"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/profile");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Statut compte Google (pour onglet Calendrier)
  const { data: googleAccount, isLoading: isLoadingGoogle, refetch: refetchGoogle } = useQuery({
    queryKey: ["googleAccount"],
    queryFn: async () => {
      const res = await fetch("/api/user/google-account");
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  // Utiliser directement la valeur du profil, avec false par défaut pendant le chargement
  // S'assurer que la valeur est bien booléenne (pas null/undefined)
  const acceptsGiftCards = profile?.acceptsGiftCards === true;
  const allowDeferredPayment = profile?.allowDeferredPayment === true;
  const subscriptionStatus = profile?.subscriptionStatus ?? initialSubscriptionStatus ?? "free";
  const isPremium = subscriptionStatus === "active";

  // Mutation pour les options calendrier (settings)
  const updateCalendarSettings = useMutation({
    mutationFn: async (data: { google_calendar_block_slots?: boolean; google_calendar_sync_out?: boolean }) => {
      const res = await fetch("/api/practitioners/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la sauvegarde");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["practitionerSettings"], data);
      addToast("Préférences enregistrées", "success");
    },
    onError: (e: Error) => {
      queryClient.invalidateQueries({ queryKey: ["practitionerSettings"] });
      addToast(e.message || "Erreur lors de la sauvegarde", "error");
    },
  });

  const unlinkGoogle = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/unlink/google", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la déconnexion");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["googleAccount"] });
      refetchGoogle();
      addToast("Compte Google déconnecté", "success");
    },
    onError: (e: Error) => addToast(e.message || "Erreur", "error"),
  });

  // Mutation pour mettre à jour acceptsGiftCards
  const updateGiftCardsSetting = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await fetch("/api/practitioners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptsGiftCards: value }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de la sauvegarde");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Mettre à jour le cache avec les données complètes retournées par l'API
      // L'API retourne tout le profil mis à jour, donc on remplace complètement le cache
      queryClient.setQueryData(["practitionerProfile"], data);
      
      addToast(
        data.acceptsGiftCards 
          ? "Cartes cadeaux activées avec succès" 
          : "Cartes cadeaux désactivées",
        "success"
      );
    },
    onError: (error: Error) => {
      // En cas d'erreur, recharger depuis le serveur pour avoir l'état réel
      queryClient.invalidateQueries({ queryKey: ["practitionerProfile"] });
      addToast(error.message || "Erreur lors de la sauvegarde", "error");
    },
  });

  // Mutation pour mettre à jour allowDeferredPayment (paiement au cabinet, Premium uniquement)
  const updateDeferredPaymentSetting = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await fetch("/api/practitioners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowDeferredPayment: value }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de la sauvegarde");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["practitionerProfile"], data);
      addToast(
        data.allowDeferredPayment
          ? "Paiement au cabinet activé"
          : "Paiement au cabinet désactivé",
        "success"
      );
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["practitionerProfile"] });
      addToast(error.message || "Erreur lors de la sauvegarde", "error");
    },
  });

  // Mettre à jour le lien vidéo quand les settings changent
  useEffect(() => {
    if (settings?.video_link) {
      setVideoLink(settings.video_link);
    }
  }, [settings]);

  // Onglet Calendrier si ?tab=calendar (retour OAuth Google)
  useEffect(() => {
    if (searchParams.get("tab") === "calendar") setActiveTab("calendar");
    
    // Gérer les messages de statut après le callback OAuth Google Calendar
    const status = searchParams.get("status");
    const email = searchParams.get("email");
    const message = searchParams.get("message");
    
    if (status === "success") {
      addToast(
        email
          ? `Compte Google Calendar connecté : ${decodeURIComponent(email)}`
          : "Compte Google Calendar connecté avec succès",
        "success"
      );
      // Recharger le statut du compte Google
      refetchGoogle();
      // Retirer les paramètres de l'URL
      router.replace("/pro/settings?tab=calendar");
    } else if (status === "error") {
      addToast(
        message
          ? `Erreur : ${decodeURIComponent(message)}`
          : "Erreur lors de la connexion du compte Google Calendar",
        "error"
      );
      // Retirer les paramètres de l'URL
      router.replace("/pro/settings?tab=calendar");
    }
  }, [searchParams, router, refetchGoogle]);

  // Vérifier le statut Stripe si on revient de l'onboarding
  useEffect(() => {
    const stripeSuccess = searchParams.get("stripe_success");
    if (stripeSuccess === "true") {
      // Vérifier le statut d'onboarding Stripe
      fetch("/api/stripe/onboarding-status")
        .then((res) => res.json())
        .then((data) => {
          if (data.complete) {
            addToast("Paiements en ligne activés avec succès !", "success");
            // Invalider les caches pour forcer le rechargement
            queryClient.invalidateQueries({ queryKey: ["practitionerProfile"] });
            queryClient.invalidateQueries({ queryKey: ["stripeOnboardingStatus"] });
            queryClient.invalidateQueries({ queryKey: ["practitionerSettings"] });
            // Retirer le paramètre de l'URL
            router.replace("/pro/settings");
          } else {
            addToast("L'onboarding Stripe n'est pas encore complet. Veuillez réessayer.", "error");
          }
        })
        .catch((error) => {
          console.error("Error checking Stripe status:", error);
          addToast("Erreur lors de la vérification du statut Stripe", "error");
        });
    }
  }, [searchParams, queryClient, router]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const requestPasswordChange = useMutation({
    mutationFn: async (data: { password: string; confirmPassword: string }) => {
      if (data.password !== data.confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      if (data.password.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères");
      }
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de la demande de changement");
      }
      return res.json();
    },
    onSuccess: () => {
      setPassword("");
      setConfirmPassword("");
      addToast("Un email de confirmation a été envoyé. Cliquez sur le lien pour valider le changement de mot de passe.", "success");
    },
    onError: (error: Error) => {
      addToast(error.message || "Erreur", "error");
    },
  });

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const passwordError = password.length > 0 && confirmPassword.length > 0 && !passwordsMatch;

  if (session.status === 'loading') return <Skeleton />

  return (
    <div className="p-8 bg-[#f7f7f7] min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
            Paramètres
          </h1>
          <p className="text-anthracite/70">
            Gérez vos préférences et votre compte
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-sable">
          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "billing"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Abonnement
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "notifications"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "security"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            <Shield className="h-4 w-4" />
            Sécurité
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "video"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            <Video className="h-4 w-4" />
            Téléconsultation
          </button>
          <button
            onClick={() => setActiveTab("shop")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "shop"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            <Gift className="h-4 w-4" />
            Boutique
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "calendar"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Calendrier
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "billing" && (
          <BillingTab
            initialSubscriptionStatus={subscriptionStatus}
            initialPlanType={initialPlanType}
          />
        )}

        {activeTab === "notifications" && (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-anthracite">
                Préférences de notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl">
                <div className="flex-1">
                  <p className="font-medium text-anthracite">Nouveaux rendez-vous</p>
                  <p className="text-sm text-anthracite/60 mt-1">
                    Recevoir un email pour chaque nouveau rendez-vous
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyNewAppointments}
                    onChange={(e) => setNotifyNewAppointments(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    notifyNewAppointments ? 'bg-sauge' : 'bg-gray-200'
                  } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sauge`}></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl">
                <div className="flex-1">
                  <p className="font-medium text-anthracite">Messages</p>
                  <p className="text-sm text-anthracite/60 mt-1">
                    Recevoir un email pour chaque nouveau message
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyMessages}
                    onChange={(e) => setNotifyMessages(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    notifyMessages ? 'bg-sauge' : 'bg-gray-200'
                  } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sauge`}></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl">
                <div className="flex-1">
                  <p className="font-medium text-anthracite">Avis clients</p>
                  <p className="text-sm text-anthracite/60 mt-1">
                    Recevoir un email pour chaque nouvel avis
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyReviews}
                    onChange={(e) => setNotifyReviews(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    notifyReviews ? 'bg-sauge' : 'bg-gray-200'
                  } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sauge`}></div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "video" && (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-anthracite">
                Téléconsultation
              </CardTitle>
              <p className="text-sm text-anthracite/60 mt-1">
                Configurez votre lien de visioconférence permanent (Zoom, Google Meet, Skype, etc.)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="video-link">Lien de visioconférence</Label>
                <Input
                  id="video-link"
                  type="url"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://zoom.us/j/123456789 ou https://meet.google.com/xxx-xxxx-xxx"
                  className="mt-2"
                />
                <p className="text-xs text-anthracite/60 mt-1">
                  Ce lien sera envoyé automatiquement aux patients pour les rendez-vous en visio.
                </p>
              </div>
              <Button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/practitioners/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ video_link: videoLink }),
                    });
                    if (!res.ok) {
                      const error = await res.json();
                      throw new Error(error.error || "Failed to save");
                    }
                    addToast("Paramètres sauvegardés", "success");
                  } catch (error: any) {
                    addToast(error.message || "Erreur lors de la sauvegarde", "error");
                  }
                }}
                className="bg-sauge hover:bg-sauge-dark text-white"
              >
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === "shop" && (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-anthracite">
                Gestion des cartes cadeaux
              </CardTitle>
              <p className="text-sm text-anthracite/60 mt-1">
                Permettez à vos clients d'offrir vos services à leurs proches. Les cartes cadeaux sont payées d'avance via Stripe.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl">
                <div className="flex-1">
                  <p className="font-medium text-anthracite">Activer les cartes cadeaux</p>
                  <p className="text-sm text-anthracite/60 mt-1">
                    Les clients pourront acheter des cartes cadeaux pour vos services
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptsGiftCards}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      updateGiftCardsSetting.mutate(newValue);
                    }}
                    disabled={updateGiftCardsSetting.isPending || isLoadingProfile}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    acceptsGiftCards ? 'bg-sauge' : 'bg-gray-200'
                  } ${updateGiftCardsSetting.isPending || profile === undefined ? 'opacity-50 cursor-not-allowed' : 'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sauge'}`}></div>
                </label>
              </div>
              {updateGiftCardsSetting.isPending && (
                <p className="text-sm text-anthracite/60">Enregistrement en cours...</p>
              )}
              {isPremium && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl border-t border-gray-100 mt-4">
                  <div className="flex-1">
                    <p className="font-medium text-anthracite">Autoriser le paiement au cabinet</p>
                    <p className="text-sm text-anthracite/60 mt-1">
                      Les clients pourront choisir « Payer sur place » (espèces/chèque) après le choix du service
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDeferredPayment}
                      onChange={(e) => updateDeferredPaymentSetting.mutate(e.target.checked)}
                      disabled={updateDeferredPaymentSetting.isPending || isLoadingProfile}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      allowDeferredPayment ? "bg-sauge" : "bg-gray-200"
                    } ${updateDeferredPaymentSetting.isPending || profile === undefined ? "opacity-50 cursor-not-allowed" : "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sauge"}`}></div>
                  </label>
                </div>
              )}
              {updateDeferredPaymentSetting.isPending && (
                <p className="text-sm text-anthracite/60">Enregistrement en cours...</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "calendar" && (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" style={{ color: "#9bb49b" }} />
                <CardTitle className="text-lg font-semibold text-anthracite">
                  Synchronisation Google Calendar
                </CardTitle>
              </div>
              <p className="text-sm text-anthracite/60 mt-1">
                Connectez votre agenda Google pour synchroniser vos rendez-vous Holia et bloquer vos créneaux personnels.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-3xl space-y-4">
                <p className="font-medium text-anthracite">Compte Google</p>
                {isLoadingGoogle ? (
                  <p className="text-sm text-anthracite/60">Chargement…</p>
                ) : googleAccount?.connected ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-anthracite/70">
                      Compte connecté : <span className="font-medium">{googleAccount.email || "—"}</span>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unlinkGoogle.mutate()}
                      disabled={unlinkGoogle.isPending}
                      className="border-gray-300 text-anthracite hover:bg-gray-100"
                    >
                      {unlinkGoogle.isPending ? "Déconnexion…" : "Déconnecter"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      // Rediriger vers la route OAuth manuelle pour Google Calendar
                      window.location.href = `/api/auth/calendar/link`;
                    }}
                    className="bg-sauge hover:bg-sauge-dark text-white"
                  >
                    Connecter mon compte Google
                  </Button>
                )}
              </div>

              <div className="border-t border-gray-100 pt-6">
                <p className="font-medium text-anthracite mb-3">Options de synchronisation</p>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-3xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-anthracite">Bloquer les créneaux Holia basés sur mon calendrier Google</p>
                      <p className="text-sm text-anthracite/60 mt-1">
                        Holia lira les événements de votre calendrier Google pour masquer automatiquement les créneaux où vous êtes déjà occupé.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings?.google_calendar_block_slots ?? true}
                        onChange={(e) =>
                          updateCalendarSettings.mutate({
                            google_calendar_block_slots: e.target.checked,
                          })
                        }
                        disabled={updateCalendarSettings.isPending}
                        className="sr-only peer"
                      />
                      <div
                        className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                          settings?.google_calendar_block_slots ?? true ? "bg-sauge" : "bg-gray-200"
                        } ${updateCalendarSettings.isPending ? "opacity-50 cursor-not-allowed" : "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sauge"}`}
                      />
                    </label>
                  </div>
                  <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-3xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-anthracite">Envoyer mes rendez-vous Holia vers Google</p>
                      <p className="text-sm text-anthracite/60 mt-1">
                        Chaque nouvelle réservation sur Holia sera automatiquement ajoutée à votre agenda Google.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings?.google_calendar_sync_out ?? true}
                        onChange={(e) =>
                          updateCalendarSettings.mutate({
                            google_calendar_sync_out: e.target.checked,
                          })
                        }
                        disabled={updateCalendarSettings.isPending}
                        className="sr-only peer"
                      />
                      <div
                        className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                          settings?.google_calendar_sync_out ?? true ? "bg-sauge" : "bg-gray-200"
                        } ${updateCalendarSettings.isPending ? "opacity-50 cursor-not-allowed" : "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sauge"}`}
                      />
                    </label>
                  </div>
                </div>
                {updateCalendarSettings.isPending && (
                  <p className="text-sm text-anthracite/60 mt-2">Enregistrement…</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "security" && (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-anthracite">
                Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <div className="relative mt-2">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    placeholder="Minimum 8 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-anthracite/60 hover:text-anthracite"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <div className="relative mt-2">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    placeholder="Répétez le mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-anthracite/60 hover:text-anthracite"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Les mots de passe ne correspondent pas
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Les mots de passe correspondent
                  </p>
                )}
              </div>
              <Button
                onClick={() => requestPasswordChange.mutate({ password, confirmPassword })}
                disabled={!passwordsMatch || password.length < 8 || requestPasswordChange.isPending}
                className="bg-sauge hover:bg-sauge-dark text-white"
              >
                {requestPasswordChange.isPending ? "Envoi en cours..." : "Demander le changement de mot de passe"}
              </Button>
              <p className="text-xs text-anthracite/60">
                Un email de confirmation vous sera envoyé. Cliquez sur le lien dans l'email pour valider le changement.
              </p>
            </CardContent>
          </Card>
        )}

        <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </div>
    </div>
  );
}
