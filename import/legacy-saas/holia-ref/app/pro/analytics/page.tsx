"use client";

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  Eye, 
  MousePointerClick, 
  Heart, 
  TrendingUp,
  BarChart3,
  Calendar,
  MapPin,
  Euro,
  TrendingDown
} from "lucide-react";
import {
  ViewsChart,
  ClicksChart,
  OverviewChart,
} from "@/components/analytics-charts";
import { Lightbulb } from "lucide-react";

interface AnalyticsData {
  ratingAvg?: number;
  profileViews: {
    total: number;
    last30Days: number;
    trend: number; // Pourcentage de variation
  };
  bookingClicks: {
    total: number;
    last30Days: number;
    trend: number;
    conversionRate: number; // Clics / Vues
  };
  favorites: {
    total: number;
    last30Days: number;
    trend: number;
  };
  searchPositions: {
    averagePosition: number;
    appearances: number;
    clickThroughRate: number; // Clics / Apparitions
  };
  appointments: {
    total: number;
    last30Days: number;
    trend: number;
  };
  revenue: {
    totalCents: number;
    last30DaysCents: number;
    trend: number;
  };
  viewsByDay: Array<{ date: string; views: number }>;
  clicksByDay: Array<{ date: string; clicks: number }>;
  chartData?: Array<{
    date: string;
    dateLabel?: string;
    views: number;
    clicks: number;
    revenue: number;
    appointments: number;
  }>;
}

export default function AnalyticsPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["practitionerAnalytics", data?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (session.status === 'loading') return <Skeleton />

  return (
    <div className="p-8 bg-[#f7f7f7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
            Statistiques & Analytics
          </h1>
          <p className="text-anthracite/70">
            Analysez votre visibilité et votre performance
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-anthracite flex items-center gap-2">
                <Eye className="h-4 w-4 text-sauge" />
                Vues du profil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-anthracite">
                  {analytics?.profileViews.last30Days || 0}
                </span>
                {analytics?.profileViews.trend && (
                  <span
                    className={`text-sm flex items-center gap-1 ${
                      analytics.profileViews.trend > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    {Math.abs(analytics.profileViews.trend).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-anthracite/60 mt-2">
                {analytics?.profileViews.total || 0} au total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-anthracite flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-sauge" />
                Clics "Réserver"
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-anthracite">
                  {analytics?.bookingClicks.last30Days || 0}
                </span>
                {analytics?.bookingClicks.trend && (
                  <span
                    className={`text-sm flex items-center gap-1 ${
                      analytics.bookingClicks.trend > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    {Math.abs(analytics.bookingClicks.trend).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-anthracite/60 mt-2">
                Taux de conversion: {analytics?.bookingClicks.conversionRate?.toFixed(1) || 0}% (RDV / Vues)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-anthracite flex items-center gap-2">
                <Heart className="h-4 w-4 text-sauge" />
                Favoris
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-anthracite">
                  {analytics?.favorites.last30Days || 0}
                </span>
                {analytics?.favorites.trend && (
                  <span
                    className={`text-sm flex items-center gap-1 ${
                      analytics.favorites.trend > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    {Math.abs(analytics.favorites.trend).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-anthracite/60 mt-2">
                {analytics?.favorites.total || 0} au total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-anthracite flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sauge" />
                Position moyenne
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-anthracite">
                  {analytics?.searchPositions.averagePosition?.toFixed(1) || "N/A"}
                </span>
              </div>
              <p className="text-xs text-anthracite/60 mt-2">
                {analytics?.searchPositions.appearances || 0} apparitions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenus nets (après commission Holia et frais Stripe) */}
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-anthracite/70 flex items-center gap-2">
              <Euro className="h-4 w-4 text-sauge" />
              Revenus nets (30 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-anthracite">
                {((analytics?.revenue.last30DaysCents || 0) / 100).toFixed(2)} €
              </span>
              {analytics?.revenue.trend !== undefined && analytics.revenue.trend !== 0 && (
                <span
                  className={`text-sm flex items-center gap-1 ${
                    analytics.revenue.trend > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {analytics.revenue.trend > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {Math.abs(analytics.revenue.trend).toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-xs text-anthracite/60 mt-2">
              Montant net versé (hors commission Holia et frais Stripe) —{" "}
              {((analytics?.revenue.totalCents || 0) / 100).toFixed(2)} € au total
            </p>
          </CardContent>
        </Card>

        {/* Graphiques */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-anthracite">
                Vue d'ensemble (30 derniers jours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewChart data={analytics?.chartData || []} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-anthracite">
                  Vues du profil (30 derniers jours)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ViewsChart data={analytics?.viewsByDay || []} />
              </CardContent>
            </Card>

            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-anthracite">
                  Clics "Réserver" (30 derniers jours)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClicksChart data={analytics?.clicksByDay || []} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Détails */}
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-anthracite">
              Détails de performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-anthracite/70 mb-2">Taux de conversion</p>
                <p className="text-2xl font-bold text-anthracite">
                  {analytics?.bookingClicks.conversionRate?.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-anthracite/60 mt-1">
                  Rendez-vous / Vues du profil
                </p>
              </div>
              <div>
                <p className="text-sm text-anthracite/70 mb-2">Taux de clic (CTR)</p>
                <p className="text-2xl font-bold text-anthracite">
                  {analytics?.searchPositions.clickThroughRate?.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-anthracite/60 mt-1">
                  Clics / Apparitions dans recherche
                </p>
              </div>
              <div>
                <p className="text-sm text-anthracite/70 mb-2">Rendez-vous (30j)</p>
                <p className="text-2xl font-bold text-anthracite">
                  {analytics?.appointments.last30Days || 0}
                </p>
                <p className="text-xs text-anthracite/60 mt-1">
                  {analytics?.appointments.trend && analytics.appointments.trend > 0 && "+"}
                  {analytics?.appointments.trend?.toFixed(0) || 0}% vs mois précédent
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conseils d'optimisation — Intelligence Holia */}
        {(() => {
          const views = analytics?.profileViews.last30Days ?? 0;
          const conversion = analytics?.bookingClicks.conversionRate ?? 0;
          const rating = analytics?.ratingAvg ?? 0;
          const tips: string[] = [];
          if (views < 15)
            tips.push("Améliorez votre SEO en complétant vos spécialités et mots-clés dans votre profil.");
          if (conversion < 2 && views > 0)
            tips.push(
              "Votre profil est vu mais peu de patients réservent. Essayez d'ajouter une photo de votre cabinet ou de clarifier vos tarifs."
            );
          if (rating > 0 && rating < 4)
            tips.push("Répondez à vos avis pour instaurer plus de confiance auprès des patients.");
          if (tips.length === 0) return null;
          return (
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-anthracite flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-sauge" />
                  Conseils d'optimisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-anthracite/90 text-sm"
                    >
                      <span className="text-sauge mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}


