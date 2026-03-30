"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, Skeleton } from "@/components/ui";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { 
  CreditCard, 
  Download, 
  ExternalLink, 
  CheckCircle, 
  XCircle,
  FileText,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ToastContainer, ToastType } from "@/components/toast";

interface PractitionerProfile {
  id: string;
  subscriptionStatus?: string;
  stripeOnboardingComplete?: boolean;
  stripeCustomerId?: string | null;
}

interface SubscriptionInvoice {
  id: string;
  number: string | null;
  amountPaid: number;
  currency: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  status: string | null;
  billingReason: string | null;
  created: number;
  periodStart: number | null;
  periodEnd: number | null;
}

interface SubscriptionTabProps {
  initialSubscriptionStatus: string;
  initialPlanType?: string | null;
}

export function SubscriptionTab({
  initialSubscriptionStatus,
}: SubscriptionTabProps) {
  const session = useSession();
  const data = session?.data;
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Récupérer le profil du praticien
  const { data: profile } = useQuery<PractitionerProfile>({
    queryKey: ["practitionerProfile"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  const subscriptionStatus = profile?.subscriptionStatus ?? initialSubscriptionStatus ?? "free";
  const isPremium = subscriptionStatus === "active";
  const stripeOnboardingComplete = profile?.stripeOnboardingComplete ?? false;
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ invoices: SubscriptionInvoice[] }>({
    queryKey: ["subscriptionInvoices"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/subscription-invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER" && isPremium,
  });
  const subscriptionInvoices = invoicesData?.invoices ?? [];

  // Mutation pour ouvrir le Stripe Customer Portal
  const openPortal = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to open portal");
      }
      const data = await res.json();
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      addToast(error.message || "Erreur lors de l'ouverture du portail", "error");
    },
  });

  // Fonction pour télécharger un relevé de commissions
  const downloadFeeStatement = async (month: string) => {
    try {
      addToast("Génération du relevé en cours...", "loading");
      const res = await fetch(`/api/finance/fee-statement?month=${month}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to download statement");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `releve-commissions-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("Relevé téléchargé avec succès", "success");
    } catch (error: any) {
      addToast(error.message || "Erreur lors du téléchargement", "error");
    }
  };

  // Générer la liste des mois disponibles (12 derniers mois)
  const generateMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy", { locale: fr });
      months.push({ value, label });
    }
    return months;
  };

  if (session.status === 'loading') return <Skeleton />

  return (
    <div className="space-y-6">
      {/* Statut de l'abonnement */}
      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Mon Offre Actuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`p-6 rounded-3xl border-2 ${
              isPremium ? "bg-[#9bb49b]/5 border-gray-100" : "bg-gray-50 border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPremium ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-anthracite text-lg">
                    {isPremium ? "Plan Premium" : "Plan Freemium"}
                  </p>
                  <p className="text-sm text-anthracite/60">
                    {isPremium
                      ? "59,00 € / mois - 0% de commission"
                      : "Gratuit - 8% de commission sur chaque transaction"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique de facturation */}
      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Historique de facturation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPremium ? (
            <div className="space-y-4">
              <div className="p-4 bg-[#9bb49b]/5 rounded-3xl border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <p className="font-medium text-anthracite">
                    Factures Stripe
                  </p>
                </div>
                <p className="text-sm text-anthracite/70 mb-4">
                  En tant qu'abonné Premium, vos factures mensuelles sont gérées par Stripe.
                  Vous pouvez les télécharger directement depuis votre portail client.
                </p>
                <Button
                  onClick={() => openPortal.mutate()}
                  disabled={openPortal.isPending || !stripeOnboardingComplete}
                  className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {openPortal.isPending ? "Ouverture..." : "Gérer mon offre et mes factures"}
                </Button>
                {!stripeOnboardingComplete && (
                  <p className="text-xs text-red-600 mt-2">
                    Vous devez d'abord activer les paiements en ligne pour accéder à vos factures.
                  </p>
                )}
              </div>

              <div className="p-4 bg-white rounded-3xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-sauge" />
                    <div>
                      <p className="font-medium text-anthracite">Factures Holia</p>
                      <p className="text-xs text-anthracite/60">
                        Historique des prélèvements Premium réglés via Stripe
                      </p>
                    </div>
                  </div>
                </div>
                {invoicesLoading ? (
                  <p className="text-sm text-anthracite/60">Chargement des factures…</p>
                ) : subscriptionInvoices.length === 0 ? (
                  <p className="text-sm text-anthracite/60">
                    Aucune facture d&apos;abonnement trouvée pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {subscriptionInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 rounded-3xl border border-gray-100 bg-[#f9fafb]"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-anthracite">
                            {invoice.number || `Facture ${invoice.id.slice(0, 8)}`}
                          </span>
                          <span className="text-xs text-anthracite/60">
                            {format(new Date(invoice.created * 1000), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-anthracite">
                            {(invoice.amountPaid / 100).toFixed(2)} €
                          </span>
                          {(invoice.hostedInvoiceUrl || invoice.invoicePdf) && (
                            <Button variant="outline" size="sm" className="rounded-xl" asChild>
                              <a
                                href={invoice.hostedInvoiceUrl || invoice.invoicePdf || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Voir
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-3xl border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-5 w-5 text-yellow-600" />
                  <p className="font-medium text-anthracite">
                    Relevés de commissions
                  </p>
                </div>
                <p className="text-sm text-anthracite/70 mb-4">
                  En tant qu'utilisateur Freemium, Holia prélève 8% de commission sur chaque transaction.
                  Téléchargez vos relevés mensuels pour votre comptabilité.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-anthracite/60" />
                  <label className="text-sm font-medium text-anthracite">
                    Sélectionner un mois:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-2xl"
                  >
                    {generateMonthOptions().map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => downloadFeeStatement(selectedMonth)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-anthracite">Relevés disponibles:</p>
                  <p className="text-xs text-anthracite/60 mb-3">
                    Seuls les mois avec des rendez-vous payés via Stripe sont disponibles.
                  </p>
                  <div className="space-y-2">
                    {generateMonthOptions().slice(0, 6).map((month) => (
                      <div
                        key={month.value}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-3xl"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-sauge" />
                          <span className="text-sm text-anthracite">{month.label}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFeeStatement(month.value)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}

