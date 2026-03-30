"use client";

import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Star,
  MessageSquare,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  BarChart3,
  Euro,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface AdminDashboardData {
  totalPractitioners: number;
  verifiedPractitioners: number;
  pendingPractitioners: number;
  suspendedPractitioners: number;
  totalUsers: number;
  totalAppointments: number;
  totalReviews: number;
  averageRating: number;
  pendingVerifications: number;
  mrr: number;
  gmv: number;
  conversionRate: number;
  reportedReviews: number;
  recentPractitioners: Array<{
    id: string;
    title: string;
    locationCity: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    user: {
      email: string;
    } | null;
  }>;
  recentAppointments: Array<{
    id: string;
    startsAt: string;
    status: string;
    practitioner: {
      title: string;
    };
    user: {
      name: string | null;
      email: string;
    };
  }>;
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export default function AdminDashboardPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();

  const { data: dashboardData, isLoading, error } = useQuery<AdminDashboardData>({
    queryKey: ["adminDashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch dashboard data");
      }
      return res.json();
    },
    enabled: !!data && data.user.role === "ADMIN",
  });

  useEffect(() => {
    if (session.status === "authenticated" && data && data.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [data, router, session.status]);

  // Show loading while session is being checked
  if (session.status === "loading") {
    return <PageSkeleton />;
  }

  // Show loading if not authenticated
  if (session.status === "unauthenticated" || !session.data) {
    return <PageSkeleton />;
  }

  // Redirect if not admin (handled by useEffect, but show loading in the meantime)
  if (data?.user?.role !== "ADMIN") {
    return <PageSkeleton />;
  }

  // Show loading while fetching dashboard data
  if (isLoading) {
    return <PageSkeleton />;
  }

  // Show error if fetch failed
  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600 font-semibold">Erreur lors du chargement</p>
          <p className="text-anthracite/70">{error instanceof Error ? error.message : "Une erreur est survenue"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
          Vue d&apos;ensemble
        </h1>
        <p className="text-anthracite/70">
          Tableau de bord administrateur Holia
        </p>
      </div>

      {/* KPI Cards - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-anthracite">
              MRR
            </CardTitle>
            <Euro className="h-4 w-4 text-[#9bb49b]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {dashboardData?.mrr?.toFixed(0) || "0"} €
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              Revenu récurrent mensuel
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-anthracite">
              GMV
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {dashboardData?.gmv?.toFixed(0) || "0"} €
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              Volume d&apos;affaires total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-anthracite">
              Utilisateurs
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {dashboardData?.totalUsers || 0}
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              {dashboardData?.verifiedPractitioners || 0} praticiens vérifiés
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-anthracite">
              Taux de conversion
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {dashboardData?.conversionRate?.toFixed(1) || "0.0"}%
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              Visiteurs → Réservations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Needed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue de Validation */}
        {dashboardData?.pendingVerifications && dashboardData.pendingVerifications > 0 ? (
          <Card className="bg-white rounded-3xl shadow-sm border border-yellow-200 bg-yellow-50/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-anthracite flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Action requise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-3xl shadow-sm border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-anthracite">
                        {dashboardData.pendingVerifications} diplôme(s) à valider
                      </p>
                      <p className="text-sm text-anthracite/70 mt-1">
                        Praticiens en attente de vérification
                      </p>
                    </div>
                    <Link href="/admin/practitioners/validation">
                      <Button className="bg-yellow-500 hover:bg-yellow-600">
                        Valider
                      </Button>
                    </Link>
                  </div>
                </div>
                {dashboardData.reportedReviews > 0 && (
                  <div className="p-4 bg-white rounded-3xl shadow-sm border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-anthracite">
                          {dashboardData.reportedReviews} avis signalé(s)
                        </p>
                        <p className="text-sm text-anthracite/70 mt-1">
                          Nécessitent une modération
                        </p>
                      </div>
                      <Link href="/admin/reviews">
                        <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                          Modérer
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Recent Activity Feed */}
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-anthracite">
              Activité récente
            </CardTitle>
            <Link href="/admin/activity">
              <Button variant="ghost" size="sm">
                Voir tout <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-3xl"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#9bb49b] mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-anthracite">{activity.message}</p>
                      <p className="text-xs text-anthracite/60 mt-1">
                        {format(new Date(activity.timestamp), "d MMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-anthracite/60 text-center py-4">
                  Aucune activité récente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-anthracite">
              Praticiens
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {dashboardData?.totalPractitioners || 0}
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              {dashboardData?.verifiedPractitioners || 0} vérifiés
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-anthracite">
              En attente
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {dashboardData?.pendingPractitioners || 0}
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              Vérifications en cours
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-anthracite">
              Rendez-vous
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {dashboardData?.totalAppointments || 0}
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              Total créés
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-anthracite">
              Note moyenne
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {dashboardData?.averageRating?.toFixed(1) || "0.0"}
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              {dashboardData?.totalReviews || 0} avis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Praticiens récents */}
      {dashboardData?.recentPractitioners && dashboardData.recentPractitioners.length > 0 && (
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-anthracite">
              Praticiens récents
            </CardTitle>
            <Link href="/admin/practitioners">
              <Button variant="ghost" size="sm">
                Voir tout <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recentPractitioners.slice(0, 5).map((practitioner) => (
                <div
                  key={practitioner.id}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-3xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-anthracite">
                        {practitioner.title}
                      </h4>
                      {practitioner.isVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      {!practitioner.isActive && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-anthracite/70 mt-1">
                      {practitioner.locationCity}{practitioner.user ? ` • ${practitioner.user.email}` : ''}
                    </p>
                    <p className="text-xs text-anthracite/60 mt-1">
                      Créé le {format(new Date(practitioner.createdAt), "d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <Link href={`/admin/practitioners`}>
                    <Button variant="outline" size="sm">
                      Voir
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
