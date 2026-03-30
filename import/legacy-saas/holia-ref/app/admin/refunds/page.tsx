"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  AlertTriangle,
  XCircle,
  CheckCircle,
  Clock,
  Euro,
  Calendar,
  User,
  FileText,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface RefundAlert {
  id: string;
  appointment_id: string | null;
  practitioner_id: string;
  amount_cents: number;
  stripe_refund_id: string | null;
  status: string;
  reason: string | null;
  error_message: string | null;
  chargeback_dispute: boolean;
  created_at: string;
  updated_at: string;
  appointment?: {
    id: string;
    starts_at: string;
    users: {
      name: string | null;
      email: string;
    };
    services: {
      name: string;
    };
  } | null;
  practitioner?: {
    id: string;
    title: string;
    users: {
      email: string;
    };
  };
}

export default function AdminRefundsPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();

  useEffect(() => {
    if (data && data.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [data, router]);

  const { data: refunds, isLoading, refetch } = useQuery<RefundAlert[]>({
    queryKey: ["adminRefunds"],
    queryFn: async () => {
      const res = await fetch("/api/admin/refunds");
      if (!res.ok) throw new Error("Failed to fetch refunds");
      return res.json();
    },
    enabled: !!session,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  // Filtrer les alertes (échecs et chargebacks)
  const alerts = refunds?.filter(
    (refund) => refund.status === "failed" || refund.chargeback_dispute
  ) || [];

  const getStatusBadge = (status: string, isChargeback: boolean) => {
    if (isChargeback) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-red-100 text-red-700 border-red-300">
          Chargeback
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-orange-100 text-orange-700 border-orange-300">
          Échec
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-yellow-100 text-yellow-700 border-yellow-300">
          En attente
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-green-100 text-green-700 border-green-300">
        Réussi
      </span>
    );
  };

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <Skeleton className="w-64 h-8" />
      </div>
    );
  }

  if (data?.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-anthracite">Alertes Remboursements</h1>
          <p className="text-anthracite/70 mt-2">
            Suivi des échecs de remboursement et des litiges (chargebacks)
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-anthracite/70 mb-1">Échecs de remboursement</p>
                <p className="text-3xl font-bold text-anthracite">
                  {refunds?.filter((r) => r.status === "failed").length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <XCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-anthracite/70 mb-1">Chargebacks</p>
                <p className="text-3xl font-bold text-anthracite">
                  {refunds?.filter((r) => r.chargeback_dispute).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-anthracite/70 mb-1">Total remboursements</p>
                <p className="text-3xl font-bold text-anthracite">
                  {refunds?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Euro className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Alertes ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-anthracite/70">Aucune alerte pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((refund) => (
                <div
                  key={refund.id}
                  className="p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(refund.status, refund.chargeback_dispute)}
                        <span className="text-sm font-semibold text-anthracite">
                          {(refund.amount_cents / 100).toFixed(2)} €
                        </span>
                      </div>
                      
                      {refund.appointment && (
                        <div className="space-y-1 text-sm text-anthracite/70 mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(refund.appointment.starts_at), "d MMMM yyyy à HH:mm", {
                                locale: fr,
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{refund.appointment.services.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>
                              {refund.appointment.users.name || refund.appointment.users.email}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-1 text-sm text-anthracite/70">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Praticien:</span>
                          <span>{refund.practitioner?.title || "N/A"}</span>
                        </div>
                        {refund.reason && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Raison:</span>
                            <span>{refund.reason}</span>
                          </div>
                        )}
                        {refund.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-2xl">
                            <span className="font-medium text-red-800">Erreur:</span>
                            <p className="text-red-700 text-xs mt-1">{refund.error_message}</p>
                          </div>
                        )}
                        {refund.stripe_refund_id && (
                          <div className="flex items-center gap-2 text-xs text-anthracite/50">
                            <span>Stripe Refund ID:</span>
                            <code className="bg-gray-100 px-2 py-1 rounded">{refund.stripe_refund_id}</code>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right text-xs text-anthracite/50">
                      <div>
                        {format(new Date(refund.created_at), "d MMM yyyy", { locale: fr })}
                      </div>
                      <div>
                        {format(new Date(refund.created_at), "HH:mm", { locale: fr })}
                      </div>
                      {refund.appointment_id && (
                        <Link
                          href={`/admin/appointments`}
                          className="text-[#9bb49b] hover:underline mt-2 inline-block"
                        >
                          Voir le RDV
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Refunds List */}
      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Tous les remboursements ({refunds?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !refunds || refunds.length === 0 ? (
            <p className="text-center text-anthracite/70 py-8">Aucun remboursement</p>
          ) : (
            <div className="space-y-3">
              {refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {getStatusBadge(refund.status, refund.chargeback_dispute)}
                    <div className="text-sm">
                      <span className="font-semibold text-anthracite">
                        {(refund.amount_cents / 100).toFixed(2)} €
                      </span>
                      {refund.appointment && (
                        <span className="text-anthracite/70 ml-2">
                          - {refund.appointment.services.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-anthracite/50">
                    {format(new Date(refund.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
