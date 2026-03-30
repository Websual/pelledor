"use client";

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Users,
  Star,
  Euro,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  ArrowRight,
  MessageSquare,
  FileText,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Settings,
  CreditCard,
  Sparkles,
  User,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui";

interface DashboardData {
  totalAppointments: number;
  confirmedAppointments: number;
  canceledAppointments: number;
  doneAppointments: number;
  pendingAppointments: number;
  averageRating: number;
  totalReviews: number;
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  monthAppointments: number;
  monthRevenueCents: number;
  weekAppointments: number;
  weekRevenueCents: number;
  totalRevenueCents: number;
  fillRate: number;
  cancellationRate: number;
  completionRate: number;
  profileViews: number;
  bookingClicks: number;
  favorites: number;
  unreadMessages: number;
  pendingInvoices: number;
  isVerified: boolean;
  completionPercentage: number;
  servicesCount: number;
  workingHoursCount: number;
  workingHoursDaysCount?: number; // Nombre de jours en demi-journées (pour l'affichage)
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  slug: string | null;
  simulatedPractitionerName?: string;
  simulatedPractitionerId?: string;
}

interface Appointment {
  id: string;
  starts_at: string;
  services: {
    id: string;
    name: string;
    duration_min: number;
    price_cents: number;
  };
  users: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}

export default function ProDashboardPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewAs = searchParams.get("viewAs");
  const isAdminViewAs = !!data && data.user.role === "ADMIN" && !!viewAs;

  // Vérifier périodiquement si la session a changé (sauf en mode "view as" admin)
  useEffect(() => {
    if (isAdminViewAs) return;
    if (data && data.user.role !== "PRACTITIONER") {
      console.log('[Dashboard] Role check failed, scheduling redirect...');
      const timer = setTimeout(() => {
        console.log('[Dashboard] Redirecting due to role check');
        window.location.href = "/";
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [data, isAdminViewAs]);

  // Tous les hooks doivent être appelés avant tout return conditionnel

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["practitionerDashboard", data?.user?.id, viewAs ?? undefined],
    queryFn: async () => {
      const url = viewAs ? `/api/practitioners/dashboard?viewAs=${encodeURIComponent(viewAs)}` : "/api/practitioners/dashboard";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    enabled: !!data && (data.user.role === "PRACTITIONER" || isAdminViewAs),
  });

  // Protection de route : rediriger si pas praticien (sauf admin en viewAs)
  if (!data) {
    console.log('[Dashboard] No session data, waiting...');
    return <PageSkeleton />;
  }

  const canAccess = data.user.role === "PRACTITIONER" || isAdminViewAs;
  if (!canAccess) {
    if (typeof window !== "undefined") {
      if (data.user.role === "ADMIN") {
        router.replace("/admin/practitioners");
      } else {
        window.location.href = "/";
      }
    }
    return null;
  }

  const upcomingAppointments = dashboardData?.upcomingAppointments || [];
  const todayAppointments = dashboardData?.todayAppointments || [];
  const nextAppointment = upcomingAppointments[0];
  const monthRevenue = dashboardData?.monthRevenueCents ? (dashboardData.monthRevenueCents / 100).toFixed(2) : "0";
  const profileViews = dashboardData?.profileViews || 0;
  const bookingClicks = dashboardData?.bookingClicks || 0;
  const favorites = dashboardData?.favorites || 0;
  const unreadMessages = dashboardData?.unreadMessages || 0;
  const pendingInvoices = dashboardData?.pendingInvoices || 0;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (session.status === 'loading') return <Skeleton />

  return (
    <div className="p-8 bg-[#f7f7f7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {isAdminViewAs && dashboardData?.simulatedPractitionerName && (
          <div className="rounded-xl bg-amber-100 border border-amber-300 text-amber-900 px-4 py-3 flex items-center justify-between gap-4">
            <span className="font-medium">
              Vue simulée : <strong>{dashboardData.simulatedPractitionerName}</strong>
            </span>
            <Link href="/admin/practitioners">
              <Button variant="outline" size="sm" className="border-amber-600 text-amber-800 hover:bg-amber-200">
                Arrêter la simulation
              </Button>
            </Link>
          </div>
        )}
        {/* Welcome Section */}
        <div className="flex justify-between items-end mb-8">
          {/* Bloc de Bienvenue (Gauche) */}
          <div>
            <h1 className="text-3xl font-bold text-anthracite">
              Bonjour {data?.user?.name?.split(" ")[0] || "Luc"}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {todayAppointments.length > 0
                ? `Vous avez ${todayAppointments.length} rendez-vous aujourd'hui.`
                : "Aucun rendez-vous prévu aujourd'hui."}
            </p>
          </div>

          {/* Badge de Configuration (Droite) */}
          {dashboardData && (() => {
            const tasksCompleted = [
              dashboardData.completionPercentage >= 100,
              dashboardData.servicesCount > 0,
              dashboardData.workingHoursCount > 0,
              dashboardData.stripeAccountId && dashboardData.stripeOnboardingComplete,
            ].filter(Boolean).length;
            const globalProgress = Math.round((tasksCompleted / 4) * 100);
            
            if (globalProgress === 100) {
              return (
                <div className="bg-white border border-[#9bb49b]/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-[#9bb49b] flex-shrink-0" />
                  <span className="text-xs font-semibold">Cabinet configuré</span>
                  <Link href={`/praticien/${dashboardData.slug || 'profil'}`} className="text-xs text-[#9bb49b] underline ml-2">
                    Voir mon profil
                  </Link>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Bandeau de Vérification */}
        {dashboardData && !dashboardData.isVerified && (
          <Card className="bg-yellow-50/50 border-yellow-200 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-anthracite mb-2">
                    Action requise : Votre identité n&apos;est pas encore vérifiée.
                  </h3>
                  <p className="text-sm text-anthracite/70 mb-4">
                    Pour activer votre profil et recevoir des réservations, vous devez vérifier votre identité en renseignant votre numéro SIRET.
                  </p>
                  <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-white">
                    <Link href="/pro/profile#verification">
                      Vérifier mon SIRET
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Widget Configuration de votre cabinet */}
        {dashboardData && (() => {
          const tasksCompleted = [
            dashboardData.completionPercentage >= 100,
            dashboardData.servicesCount > 0,
            dashboardData.workingHoursCount > 0,
            dashboardData.stripeAccountId && dashboardData.stripeOnboardingComplete,
          ].filter(Boolean).length;
          const globalProgress = Math.round((tasksCompleted / 4) * 100);
          
          // Ne pas afficher le widget si configuration complète à 100%
          if (globalProgress === 100) {
            return null;
          }
          
          return (
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-anthracite flex items-center gap-2">
                  <Settings className="h-5 w-5 text-sauge" />
                  Configuration de votre cabinet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Barre de progression globale */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-anthracite">
                      Progression globale
                    </span>
                    <span className="text-sm font-semibold text-sauge">
                      {globalProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-sable/30 rounded-full h-3">
                    <div
                      className="bg-sauge h-3 rounded-full transition-all duration-300"
                      style={{ width: `${globalProgress}%` }}
                    />
                  </div>
                </div>

                {/* Liste de tâches */}
                <div className="space-y-3">
                {/* Compléter mon profil public */}
                <Link
                  href="/pro/profile#identity"
                  className={`flex items-center gap-3 p-3 rounded-3xl transition-colors ${
                    dashboardData.completionPercentage >= 100
                      ? "bg-green-50 border border-green-200"
                      : "bg-gray-50 hover:bg-sauge/5"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {dashboardData.completionPercentage >= 100 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <User className="h-5 w-5 text-anthracite/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        dashboardData.completionPercentage >= 100
                          ? "text-green-800 line-through"
                          : "text-anthracite"
                      }`}
                    >
                      Compléter mon profil public
                    </p>
                    <p className="text-xs text-anthracite/60">
                      {dashboardData.completionPercentage}% complété
                    </p>
                  </div>
                  {dashboardData.completionPercentage < 100 && (
                    <ArrowRight className="h-4 w-4 text-anthracite/40" />
                  )}
                </Link>

                {/* Définir mes tarifs et services */}
                <Link
                  href="/pro/profile#services"
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                    dashboardData.servicesCount > 0
                      ? "bg-green-50 border border-green-200"
                      : "bg-[#f7f7f7] hover:bg-sauge/5"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {dashboardData.servicesCount > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-anthracite/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        dashboardData.servicesCount > 0
                          ? "text-green-800 line-through"
                          : "text-anthracite"
                      }`}
                    >
                      Définir mes tarifs et services
                    </p>
                    <p className="text-xs text-anthracite/60">
                      {dashboardData.servicesCount > 0
                        ? `${dashboardData.servicesCount} service${dashboardData.servicesCount > 1 ? "s" : ""} configuré${dashboardData.servicesCount > 1 ? "s" : ""}`
                        : "Aucun service configuré"}
                    </p>
                  </div>
                  {dashboardData.servicesCount === 0 && (
                    <ArrowRight className="h-4 w-4 text-anthracite/40" />
                  )}
                </Link>

                {/* Configurer mon agenda */}
                <Link
                  href="/pro/profile#hours"
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                    dashboardData.workingHoursCount > 0
                      ? "bg-green-50 border border-green-200"
                      : "bg-[#f7f7f7] hover:bg-sauge/5"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {dashboardData.workingHoursCount > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Calendar className="h-5 w-5 text-anthracite/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        dashboardData.workingHoursCount > 0
                          ? "text-green-800 line-through"
                          : "text-anthracite"
                      }`}
                    >
                      Configurer mon agenda (horaires & dispos)
                    </p>
                    <p className="text-xs text-anthracite/60">
                      {dashboardData.workingHoursCount > 0
                        ? (() => {
                            const daysCount = dashboardData.workingHoursDaysCount ?? dashboardData.workingHoursCount;
                            // Afficher avec .5 si nécessaire (ex: 4.5 jours)
                            if (daysCount % 1 === 0) {
                              return `${daysCount} jour${daysCount > 1 ? "s" : ""} configuré${daysCount > 1 ? "s" : ""}`;
                            } else {
                              return `${daysCount.toFixed(1)}j configuré${daysCount > 1 ? "s" : ""}`;
                            }
                          })()
                        : "Aucun horaire configuré"}
                    </p>
                  </div>
                  {dashboardData.workingHoursCount === 0 && (
                    <ArrowRight className="h-4 w-4 text-anthracite/40" />
                  )}
                </Link>

                {/* Connecter mon compte de paiement Stripe */}
                <Link
                  href="/pro/settings"
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                    dashboardData.stripeAccountId && dashboardData.stripeOnboardingComplete
                      ? "bg-green-50 border border-green-200"
                      : "bg-[#f7f7f7] hover:bg-sauge/5"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {dashboardData.stripeAccountId && dashboardData.stripeOnboardingComplete ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <CreditCard className="h-5 w-5 text-anthracite/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        dashboardData.stripeAccountId && dashboardData.stripeOnboardingComplete
                          ? "text-green-800 line-through"
                          : "text-anthracite"
                      }`}
                    >
                      Connecter mon compte de paiement Stripe
                    </p>
                    <p className="text-xs text-anthracite/60">
                      {dashboardData.stripeAccountId && dashboardData.stripeOnboardingComplete
                        ? "Compte Stripe connecté"
                        : dashboardData.stripeAccountId
                        ? "Configuration Stripe incomplète"
                        : "⚠️ Compte Stripe non connecté"}
                    </p>
                  </div>
                  {(!dashboardData.stripeAccountId || !dashboardData.stripeOnboardingComplete) && (
                    <ArrowRight className="h-4 w-4 text-anthracite/40" />
                  )}
                </Link>
                </div>
              </CardContent>
            </Card>
          );
        })()}


        {/* KPIs Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CA du mois */}
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-anthracite flex items-center justify-between">
                <span>Chiffre d'affaires</span>
                <Euro className="h-4 w-4 text-sauge" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-anthracite">{monthRevenue} €</span>
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  +12%
                </span>
              </div>
              <p className="text-xs text-anthracite/60 mt-2">Ce mois</p>
            </CardContent>
          </Card>

          {/* Vues Profil */}
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-anthracite flex items-center justify-between">
                <span>Vues du profil</span>
                <Eye className="h-4 w-4 text-sauge" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-anthracite">{profileViews}</span>
                <span className="text-sm text-anthracite/60">vues</span>
              </div>
              <p className="text-xs text-anthracite/60 mt-2">
                {bookingClicks} clics sur "Réserver"
              </p>
            </CardContent>
          </Card>

          {/* Note moyenne */}
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-anthracite flex items-center justify-between">
                <span>Note moyenne</span>
                <Star className="h-4 w-4 text-sauge fill-sauge" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-anthracite">
                  {dashboardData?.averageRating?.toFixed(1) || "0.0"}
                </span>
                <span className="text-sm text-anthracite/60">/ 5</span>
              </div>
              <p className="text-xs text-anthracite/60 mt-2">
                {dashboardData?.totalReviews || 0} avis
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid - Bento Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prochain RDV */}
            {nextAppointment && (
              <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-anthracite">
                    Prochain rendez-vous
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-sauge/10 rounded-full flex items-center justify-center">
                          <span className="text-sauge font-semibold text-lg">
                            {nextAppointment.users.name?.charAt(0).toUpperCase() || "P"}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-anthracite">
                            {nextAppointment.users.name || "Patient"}
                          </h3>
                          <p className="text-sm text-anthracite/60">{nextAppointment.services.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-anthracite/70">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(nextAppointment.starts_at), "EEEE d MMMM", { locale: fr })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(nextAppointment.starts_at), "HH:mm")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Euro className="h-4 w-4" />
                          {(nextAppointment.services.price_cents / 100).toFixed(2)} €
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/pro/appointments/${nextAppointment.id}`}>
                          Voir le dossier
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/pro/messages?appointment=${nextAppointment.id}`}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activité Récente */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-anthracite">
                  Activité récente
                </CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/pro/appointments">
                    Voir tout <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingAppointments.slice(0, 5).map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-3xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sauge/10 rounded-full flex items-center justify-center">
                          <span className="text-sauge font-semibold text-sm">
                            {apt.users.name?.charAt(0).toUpperCase() || "P"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-anthracite">{apt.users.name || "Patient"}</p>
                          <p className="text-sm text-anthracite/60">{apt.services.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-anthracite">
                          {format(new Date(apt.starts_at), "d MMM", { locale: fr })}
                        </p>
                        <p className="text-xs text-anthracite/60">
                          {format(new Date(apt.starts_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {upcomingAppointments.length === 0 && (
                    <p className="text-center text-anthracite/60 py-8">
                      Aucune activité récente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            {/* À faire */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-anthracite">
                  À faire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingInvoices > 0 && (
                  <Link href="/pro/finance" className="flex items-center gap-3 p-3 bg-gray-50 rounded-3xl hover:bg-sauge/5 transition-colors">
                    <FileText className="h-5 w-5 text-sauge" />
                    <div className="flex-1">
                      <p className="font-medium text-anthracite">{pendingInvoices} facture{pendingInvoices > 1 ? "s" : ""} à générer</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-anthracite/40" />
                  </Link>
                )}
                {unreadMessages > 0 && (
                  <Link href="/pro/messages" className="flex items-center gap-3 p-3 bg-gray-50 rounded-3xl hover:bg-sauge/5 transition-colors">
                    <MessageSquare className="h-5 w-5 text-sauge" />
                    <div className="flex-1">
                      <p className="font-medium text-anthracite">{unreadMessages} message{unreadMessages > 1 ? "s" : ""} non lu{unreadMessages > 1 ? "s" : ""}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-anthracite/40" />
                  </Link>
                )}
                <Link href="/pro/analytics" className="flex items-center gap-3 p-3 bg-gray-50 rounded-3xl hover:bg-sauge/5 transition-colors">
                  <BarChart3 className="h-5 w-5 text-sauge" />
                  <div className="flex-1">
                    <p className="font-medium text-anthracite">Voir les statistiques</p>
                    <p className="text-xs text-anthracite/60">Analytics détaillées</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-anthracite/40" />
                </Link>
                {pendingInvoices === 0 && unreadMessages === 0 && (
                  <p className="text-center text-anthracite/60 py-4 text-sm">
                    Tout est à jour ! 🎉
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stats rapides */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-anthracite">
                  Statistiques rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-anthracite/70">Rendez-vous ce mois</span>
                  <span className="font-semibold text-anthracite">{dashboardData?.monthAppointments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-anthracite/70">Favoris</span>
                  <span className="font-semibold text-anthracite">{favorites}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-anthracite/70">Taux de remplissage</span>
                  <span className="font-semibold text-anthracite">{dashboardData?.fillRate?.toFixed(0) || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-anthracite/70">Taux d'annulation</span>
                  <span className="font-semibold text-anthracite">{dashboardData?.cancellationRate?.toFixed(0) || 0}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
