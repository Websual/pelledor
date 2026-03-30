"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect, Suspense } from "react";
import {
  Euro,
  FileText,
  Download,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Info,
  Calendar,
  X,
  CreditCard,
  Loader2,
  User,
  Ticket,
} from "lucide-react";
import { CreateInvoiceModal } from "@/components/create-invoice-modal";
import { SubscriptionTab } from "./subscription-tab";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ToastContainer, ToastType } from "@/components/toast";

interface FinanceData {
  totalRevenueCents: number;
  monthRevenueCents: number;
  pendingRevenueCents: number;
  paidRevenueCents: number;
  consultationsRevenueCents?: number;
  eventsRevenueCents?: number;
  giftCardsRevenueCents?: number;
  giftCards?: GiftCard[];
  appointments?: Appointment[];
  transactions?: Transaction[];
  invoices: Invoice[];
  payouts: Payout[];
  balanceCents: number; // Solde disponible pour virement
}

interface FeeBreakdown {
  totalAmountCents: number;
  stripeProcessingFeesCents: number;
  holiaCommissionCents: number;
  netAmountCents: number;
  usesRealFees?: boolean; // Indique si on utilise les frais réels depuis Stripe ou théoriques
}

interface Transaction {
  id: string;
  type: "Consultation" | "Événement";
  date: string;
  label: string;
  sublabel: string | null;
  feeBreakdown: FeeBreakdown;
}

interface GiftCard {
  id: string;
  code: string;
  amountCents: number;
  netAmountCents: number;
  stripeProcessingFeesCents: number;
  holiaCommissionCents: number;
  status: string;
  purchasedAt: string;
  redeemedAt: string | null;
  feeBreakdown?: FeeBreakdown;
}

interface Appointment {
  id: string;
  date: string;
  service: {
    name: string;
    priceCents: number;
  };
  user: {
    name: string | null;
    email: string;
  };
  feeBreakdown: FeeBreakdown;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  taxCents: number;
  totalCents: number;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELED";
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  feeBreakdown?: FeeBreakdown;
  appointment?: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
    service: {
      name: string;
    };
  };
  ticket?: {
    id: string;
    eventTitle: string | null;
    eventDate: string | null;
    user?: { name: string | null; email: string };
  };
}

interface Payout {
  id: string;
  amountCents: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  requestedAt: string;
  processedAt: string | null;
}

type FinancePageClientProps = {
  initialSubscriptionStatus: string;
  initialPlanType?: string | null;
};

function FinancePageContent({
  initialSubscriptionStatus,
  initialPlanType,
}: FinancePageClientProps) {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "invoices" | "payouts" | "subscription">("overview");
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<"current_month" | "last_month" | "full_year">("full_year");
  const [exporting, setExporting] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const [loadingBankLink, setLoadingBankLink] = useState(false);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  // Vérifier si un onglet est spécifié dans l'URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["overview", "invoices", "payouts", "subscription"].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const { data: financeData, isLoading } = useQuery<FinanceData>({
    queryKey: ["practitionerFinance", data?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/finance");
      if (!res.ok) throw new Error("Failed to fetch finance data");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery<{
    payouts: Array<{ id: string; amount: number; arrival_date: string | null; status: string; created: string | null }>;
  }>({
    queryKey: ["practitionerPayouts", data?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/finance/payouts");
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER" && activeTab === "payouts",
  });

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery<{
    available: number;
    pending: number;
    currency: string;
    automaticPayouts: boolean;
  }>({
    queryKey: ["practitionerBalance", data?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/finance/balance");
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER" && activeTab === "payouts",
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/practitioners/finance/payout", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors du virement");
      return json;
    },
    onSuccess: (result) => {
      const amountEur = (result.amountCents / 100).toFixed(2);
      addToast(`Virement de ${amountEur}€ initié vers votre compte bancaire`, "success");
      queryClient.invalidateQueries({ queryKey: ["practitionerFinance"] });
      queryClient.invalidateQueries({ queryKey: ["practitionerPayouts"] });
      refetchBalance();
    },
    onError: (error: Error) => {
      addToast(error.message || "Erreur lors du virement", "error");
    },
  });

  const openStripeBankLink = async () => {
    setLoadingBankLink(true);
    try {
      const res = await fetch("/api/practitioners/finance/stripe-login-link");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");
      if (json.url) window.open(json.url, "_blank", "noopener,noreferrer");
      else addToast("Impossible d'ouvrir le portail Stripe", "error");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Erreur", "error");
    } finally {
      setLoadingBankLink(false);
    }
  };

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  const totalRevenue = financeData?.totalRevenueCents ? (financeData.totalRevenueCents / 100).toFixed(2) : "0";
  const monthRevenue = financeData?.monthRevenueCents ? (financeData.monthRevenueCents / 100).toFixed(2) : "0";
  const pendingRevenue = financeData?.pendingRevenueCents ? (financeData.pendingRevenueCents / 100).toFixed(2) : "0";
  // Solde: priorité au solde Stripe (onglet Virements) sinon fallback finance API
  const availableEur =
    activeTab === "payouts" && balanceData !== undefined
      ? (balanceData.available / 100).toFixed(2)
      : financeData?.balanceCents
        ? (financeData.balanceCents / 100).toFixed(2)
        : "0";
  const pendingEur =
    activeTab === "payouts" && balanceData !== undefined
      ? (balanceData.pending / 100).toFixed(2)
      : "0";
  const availableCents =
    activeTab === "payouts" && balanceData !== undefined
      ? balanceData.available
      : financeData?.balanceCents ?? 0;

  const formatAmount = (cents: number) =>
    (cents / 100).toFixed(2).replace(".", ",") + " €";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
      case "COMPLETED":
        return "text-green-600 bg-[#9bb49b]/5";
      case "PENDING":
      case "PROCESSING":
        return "text-yellow-600 bg-yellow-50";
      case "OVERDUE":
      case "FAILED":
        return "text-red-600 bg-red-50";
      default:
        return "text-anthracite/60 bg-[#f7f7f7]";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "PENDING":
      case "PROCESSING":
        return <Clock className="h-4 w-4" />;
      case "OVERDUE":
      case "FAILED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (session.status === 'loading') return <Skeleton />

  return (
    <div className="p-8 bg-[#f7f7f7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
              Finance & Factures
            </h1>
            <p className="text-anthracite/70">
              Gérez vos revenus, factures et virements
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCreateInvoiceModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer une facture libre
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowExportModal(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter pour mon comptable
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-sable">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "overview"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "invoices"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            Mes Factures
          </button>
          <button
            onClick={() => setActiveTab("payouts")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "payouts"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            Virements & Solde
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "subscription"
                ? "text-sauge border-b-2 border-sauge"
                : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            Mon Abonnement Holia
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-anthracite">
                      Revenus totaux
                    </CardTitle>
                    <div className="group relative">
                      <Info className="h-4 w-4 text-anthracite/40 cursor-help hover:text-anthracite/60 transition-colors" />
                      <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-anthracite text-white text-xs rounded-3xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        Le revenu affiché est le montant net après déduction des frais de service Holia (8%) et des frais de transaction bancaires Stripe.
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-anthracite"></div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-anthracite">{totalRevenue} €</span>
                  </div>
                  <p className="text-xs text-anthracite/60 mt-2">Tous les temps • Net de frais</p>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-anthracite">
                      Revenus du mois
                    </CardTitle>
                    <div className="group relative">
                      <Info className="h-4 w-4 text-anthracite/40 cursor-help hover:text-anthracite/60 transition-colors" />
                      <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-anthracite text-white text-xs rounded-3xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        Le revenu affiché est le montant net après déduction des frais de service Holia (8%) et des frais de transaction bancaires Stripe.
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-anthracite"></div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-anthracite">{monthRevenue} €</span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-xs text-anthracite/60 mt-2">Ce mois • Net de frais</p>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-anthracite">
                    En attente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-anthracite">{pendingRevenue} €</span>
                  </div>
                  <p className="text-xs text-anthracite/60 mt-2">Non encaissé</p>
                </CardContent>
              </Card>
            </div>

            {/* Détail par activité */}
            {(financeData?.consultationsRevenueCents !== undefined || financeData?.eventsRevenueCents !== undefined) && (
              <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-anthracite">
                    Détail par activité
                  </CardTitle>
                  <p className="text-sm text-anthracite/60 mt-1">
                    Répartition des revenus nets (consultations et ventes de billets)
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                      <p className="text-sm font-medium text-anthracite/70 mb-1">Consultations</p>
                      <p className="text-2xl font-bold text-sauge">
                        {formatAmount(financeData?.consultationsRevenueCents ?? 0)}
                      </p>
                      <p className="text-xs text-anthracite/50 mt-1">RDV payés • Net de frais</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                      <p className="text-sm font-medium text-anthracite/70 mb-1">Événements</p>
                      <p className="text-2xl font-bold text-sauge">
                        {formatAmount(financeData?.eventsRevenueCents ?? 0)}
                      </p>
                      <p className="text-xs text-anthracite/50 mt-1">Ventes de billets • Net de frais</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historique des transactions (Consultations + Événements) */}
            {financeData?.transactions && financeData.transactions.length > 0 && (
              <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-anthracite">
                    Historique des transactions
                  </CardTitle>
                  <p className="text-sm text-anthracite/60 mt-1">
                    Décomposition détaillée des frais pour chaque transaction
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {financeData.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-4 bg-gray-50 rounded-3xl border border-gray-100"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                                tx.type === "Consultation"
                                  ? "bg-[#9bb49b]/10 text-[#9bb49b]"
                                  : "bg-sauge/10 text-sauge"
                              }`}
                            >
                              {tx.type === "Consultation" ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Ticket className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-anthracite">
                                {tx.label}
                              </p>
                              <p className="text-sm text-anthracite/60">
                                {tx.sublabel || "—"} • {format(new Date(tx.date), "d MMM yyyy à HH:mm", { locale: fr })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-anthracite/70">
                              {tx.type === "Consultation" ? "Prix de la séance" : "Montant total"} :
                            </span>
                            <span className="font-medium text-anthracite">{(tx.feeBreakdown.totalAmountCents / 100).toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>
                              Frais de transaction (Stripe)
                              {tx.feeBreakdown.usesRealFees && (
                                <span className="text-xs text-anthracite/50 ml-1">(réels)</span>
                              )}
                              :
                            </span>
                            <span>-{(tx.feeBreakdown.stripeProcessingFeesCents / 100).toFixed(2)} €</span>
                          </div>
                          {tx.feeBreakdown.holiaCommissionCents > 0 && (
                            <div className="flex justify-between text-orange-600">
                              <span>Commission Holia :</span>
                              <span>-{(tx.feeBreakdown.holiaCommissionCents / 100).toFixed(2)} €</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-gray-100">
                            <span className="font-semibold text-sauge">Montant net versé :</span>
                            <span className="font-bold text-lg text-sauge">{(tx.feeBreakdown.netAmountCents / 100).toFixed(2)} €</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section Cartes Cadeaux */}
            {financeData?.giftCards && financeData.giftCards.length > 0 && (
              <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-anthracite">
                    Cartes cadeaux vendues
                  </CardTitle>
                  <p className="text-sm text-anthracite/60 mt-1">
                    Décomposition détaillée des frais pour chaque transaction
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {financeData.giftCards.map((gc) => (
                      <div
                        key={gc.id}
                        className="p-4 bg-gray-50 rounded-3xl border border-gray-100"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🎁</span>
                            <div>
                              <p className="font-semibold text-anthracite">
                                Code: {gc.code}
                              </p>
                              <p className="text-sm text-anthracite/60">
                                Achetée le {format(new Date(gc.purchasedAt), "d MMM yyyy", { locale: fr })}
                                {gc.redeemedAt && ` • Utilisée le ${format(new Date(gc.redeemedAt), "d MMM yyyy", { locale: fr })}`}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              gc.status === "redeemed"
                                ? "text-green-600 bg-[#9bb49b]/5"
                                : gc.status === "active"
                                ? "text-blue-600 bg-blue-50"
                                : "text-anthracite/60 bg-[#f7f7f7]"
                            }`}
                          >
                            {gc.status === "redeemed" && "Utilisée"}
                            {gc.status === "active" && "Active"}
                            {gc.status === "pending" && "En attente"}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-anthracite/70">Montant total :</span>
                            <span className="font-medium text-anthracite">{(gc.amountCents / 100).toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>
                              Frais de transaction (Stripe)
                              {gc.feeBreakdown?.usesRealFees && (
                                <span className="text-xs text-anthracite/50 ml-1">(réels)</span>
                              )}
                              :
                            </span>
                            <span>-{(gc.stripeProcessingFeesCents / 100).toFixed(2)} €</span>
                          </div>
                          {gc.holiaCommissionCents > 0 && (
                            <div className="flex justify-between text-orange-600">
                              <span>Commission Holia :</span>
                              <span>-{(gc.holiaCommissionCents / 100).toFixed(2)} €</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-gray-100">
                            <span className="font-semibold text-sauge">Montant net versé :</span>
                            <span className="font-bold text-lg text-sauge">{(gc.netAmountCents / 100).toFixed(2)} €</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {financeData.giftCardsRevenueCents && financeData.giftCardsRevenueCents > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-anthracite">
                          Total cartes cadeaux (net)
                        </span>
                        <span className="text-lg font-bold text-sauge">
                          {(financeData.giftCardsRevenueCents / 100).toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-6">
            {/* Filtres */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="pt-6">
                <div className="flex gap-4 items-center">
                  <label className="text-sm text-anthracite/70">Filtrer par mois:</label>
                  <input
                    type="month"
                    className="p-2 border border-gray-300 rounded-2xl"
                    defaultValue={format(new Date(), "yyyy-MM")}
                    onChange={async (e) => {
                      const month = e.target.value;
                      const res = await fetch(`/api/invoices?month=${month}`);
                      if (res.ok) {
                        const invoices = await res.json();
                        queryClient.setQueryData(["practitionerFinance", (data as any)?.user?.id], (old: any) => ({
                          ...old,
                          invoices,
                        }));
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Liste des factures */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-anthracite">
                  Mes Factures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financeData?.invoices && financeData.invoices.length > 0 ? (
                    financeData.invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="p-4 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors border border-gray-100"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-sauge" />
                            <div>
                              <p className="font-semibold text-anthracite">
                                {invoice.invoiceNumber}
                              </p>
                              {invoice.ticket ? (
                                <p className="text-sm text-anthracite/60">
                                  {invoice.ticket.user?.name || invoice.ticket.user?.email || "Client"} - {invoice.ticket.eventTitle ?? "Événement"}
                                  {invoice.ticket.eventDate && ` • ${format(new Date(invoice.ticket.eventDate), "d MMM yyyy", { locale: fr })}`}
                                </p>
                              ) : invoice.appointment ? (
                                <p className="text-sm text-anthracite/60">
                                  {invoice.appointment.user.name || invoice.appointment.user.email} - {invoice.appointment.service.name}
                                </p>
                              ) : (
                                <p className="text-sm text-anthracite/60">
                                  Facture libre
                                </p>
                              )}
                              <p className="text-xs text-anthracite/50 mt-1">
                                {format(new Date(invoice.createdAt), "d MMM yyyy", { locale: fr })}
                                {invoice.dueDate && ` • Échéance: ${format(new Date(invoice.dueDate), "d MMM yyyy", { locale: fr })}`}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {getStatusIcon(invoice.status)}
                            {invoice.status === "DRAFT" && "Brouillon"}
                            {invoice.status === "SENT" && "Envoyée"}
                            {invoice.status === "PAID" && "Payée"}
                            {invoice.status === "OVERDUE" && "En retard"}
                            {invoice.status === "CANCELED" && "Annulée"}
                          </span>
                        </div>
                        {invoice.feeBreakdown && invoice.status === "PAID" && (
                          <div className="space-y-1 text-sm mt-3 pt-3 border-t border-sable/30">
                            <div className="flex justify-between">
                              <span className="text-anthracite/70">
                                Prestation {invoice.ticket?.eventTitle ?? invoice.appointment?.service?.name ?? "Service"} :
                              </span>
                              <span className="font-medium text-anthracite">{(invoice.feeBreakdown.netAmountCents / 100).toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-orange-600">
                              <span>Frais de service plateforme :</span>
                              <span>-{(invoice.feeBreakdown.holiaCommissionCents / 100).toFixed(2)} €</span>
                            </div>
                            {invoice.feeBreakdown.stripeProcessingFeesCents > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>
                                  Frais de traitement sécurisé
                                  {invoice.feeBreakdown.usesRealFees && (
                                    <span className="text-xs text-anthracite/50 ml-1">(réels)</span>
                                  )}
                                  :
                                </span>
                                <span>-{(invoice.feeBreakdown.stripeProcessingFeesCents / 100).toFixed(2)} €</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-gray-100">
                              <span className="font-semibold text-anthracite">Total TTC :</span>
                              <span className="font-bold text-anthracite">{(invoice.feeBreakdown.totalAmountCents / 100).toFixed(2)} €</span>
                            </div>
                            <div className="text-xs text-anthracite/50 mt-1 pt-1 border-t border-gray-50">
                              💡 Pour votre déclaration URSSAF, utilisez uniquement le montant "Prestation"
                            </div>
                          </div>
                        )}
                        {(!invoice.feeBreakdown || invoice.status !== "PAID") && (
                          <div className="flex items-center gap-4 text-sm text-anthracite/70 mt-3">
                            <span className="font-semibold">{(invoice.totalCents / 100).toFixed(2)} €</span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          {invoice.status === "SENT" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                // TODO: Renvoyer l'email
                                alert("Renvoyer l'email à venir");
                              }}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-anthracite/60 py-8">
                      Aucune facture pour le moment
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="space-y-6">
            {/* Solde disponible */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold text-anthracite">
                      Solde disponible
                    </CardTitle>
                    {balanceData?.automaticPayouts && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sauge/20 text-sauge">
                        Automatique
                      </span>
                    )}
                  </div>
                  <div className="group relative">
                    <Info className="h-4 w-4 text-anthracite/40 cursor-help hover:text-anthracite/60 transition-colors" />
                    <div className="absolute bottom-full right-0 mb-2 w-80 p-3 bg-anthracite text-white text-xs rounded-3xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                      L&apos;argent arrive sur votre solde disponible quelques jours après la séance. Stripe effectue ensuite les virements automatiquement selon votre configuration.
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-anthracite"></div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1 mb-4">
                  <div className="flex items-baseline gap-2">
                    {activeTab === "payouts" && balanceLoading ? (
                      <Skeleton className="h-10 w-24 rounded-3xl" />
                    ) : (
                      <span className="text-4xl font-bold text-anthracite">{availableEur.replace(".", ",")} €</span>
                    )}
                  </div>
                  {(balanceData?.pending ?? 0) > 0 && (
                    <p className="text-sm text-anthracite/60">
                      Prochain virement (estimation) : {pendingEur.replace(".", ",")} €
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="bg-[#9bb49b] hover:bg-[#9bb49b]/90 text-white"
                    disabled={payoutMutation.isPending || availableCents <= 0}
                    onClick={() => payoutMutation.mutate()}
                  >
                    {payoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {payoutMutation.isPending ? "Virement en cours…" : "Demander un virement"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={loadingBankLink}
                    onClick={openStripeBankLink}
                  >
                    {loadingBankLink ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Gérer mes coordonnées bancaires
                  </Button>
                </div>
                <p className="text-xs text-anthracite/60 mt-3">
                  Les virements sont traités sous 2-3 jours ouvrés
                </p>
              </CardContent>
            </Card>

            {/* Historique des virements */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-anthracite">
                  Historique des virements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payoutsLoading ? (
                  <div className="space-y-3 py-8">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ) : payoutsData?.payouts && payoutsData.payouts.length > 0 ? (
                  <div className="rounded-3xl overflow-hidden border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left font-medium text-anthracite">Montant</th>
                          <th className="px-4 py-3 text-left font-medium text-anthracite">Date de virement</th>
                          <th className="px-4 py-3 text-left font-medium text-anthracite">Arrivée prévue</th>
                          <th className="px-4 py-3 text-right font-medium text-anthracite">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payoutsData.payouts.map((payout) => (
                          <tr key={payout.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-semibold text-anthracite">
                              {formatAmount(payout.amount)}
                            </td>
                            <td className="px-4 py-3 text-anthracite/80">
                              {payout.created ? format(new Date(payout.created), "d MMM yyyy", { locale: fr }) : "—"}
                            </td>
                            <td className="px-4 py-3 text-anthracite/80">
                              {payout.arrival_date ? format(new Date(payout.arrival_date), "d MMM yyyy", { locale: fr }) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  payout.status === "Payé" ? "text-green-600 bg-[#9bb49b]/5" :
                                  payout.status === "En route" ? "text-yellow-600 bg-yellow-50" :
                                  payout.status === "Échoué" || payout.status === "Annulé" ? "text-red-600 bg-red-50" :
                                  "text-anthracite/60 bg-[#f7f7f7]"
                                }`}
                              >
                                {payout.status === "Payé" && <CheckCircle className="h-3 w-3" />}
                                {payout.status === "En route" && <Clock className="h-3 w-3" />}
                                {payout.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-anthracite/60 py-8">
                    Aucun virement pour le moment
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "subscription" && (
          <SubscriptionTab
            initialSubscriptionStatus={initialSubscriptionStatus}
            initialPlanType={initialPlanType}
          />
        )}
      </div>

      <CreateInvoiceModal
        isOpen={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
      />
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Modal choix période export comptable */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white max-w-md w-full rounded-3xl shadow-lg border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sauge" />
                Exporter pour mon comptable
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowExportModal(false)} aria-label="Fermer">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-anthracite/70">
                Choisissez la période à inclure dans l&apos;export CSV (factures payées uniquement).
              </p>
              <div className="space-y-2">
                {[
                  { value: "current_month" as const, label: "Mois en cours" },
                  { value: "last_month" as const, label: "Mois dernier" },
                  { value: "full_year" as const, label: "Année complète" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExportPeriod(opt.value)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-colors ${
                      exportPeriod === opt.value
                        ? "border-sauge bg-sauge/10 text-sauge"
                        : "border-gray-100 hover:border-gray-200 text-anthracite"
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    {exportPeriod === opt.value && <CheckCircle className="h-5 w-5 text-sauge" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="rounded-2xl flex-1"
                  onClick={() => setShowExportModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="rounded-2xl flex-1 bg-sauge hover:bg-sauge/90"
                  disabled={exporting}
                  onClick={async () => {
                    setExporting(true);
                    try {
                      const res = await fetch(`/api/practitioners/finance/export?period=${exportPeriod}`);
                      if (!res.ok) throw new Error("Export failed");
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      const filename = res.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1] ?? `export-comptable-${exportPeriod}-${new Date().toISOString().split("T")[0]}.csv`;
                      a.download = filename;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      setShowExportModal(false);
                    } catch (error) {
                      alert("Erreur lors de l'export");
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  {exporting ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {exporting ? "Export en cours…" : "Télécharger le CSV"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function FinancePageClient(props: FinancePageClientProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FinancePageContent {...props} />
    </Suspense>
  );
}

