"use client";

export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  MessageSquare, 
  UserCircle, 
  BarChart3, 
  Euro, 
  Settings,
  Plus,
  Menu,
  X,
  FileText,
  Star,
  LogOut,
  ArrowLeft,
  Home,
  Bell,
  CalendarDays,
  ShoppingBag,
  Megaphone
} from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { MiniFooter } from "@/components/mini-footer";
import Link from "next/link";
import { signOut } from "next-auth/react";



interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  group?: string;
}

const navItems: NavItem[] = [
  // Groupe 1: Pilotage (Quotidien)
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, href: "/pro/dashboard", group: "quotidien" },
  { id: "calendar", label: "Agenda", icon: Calendar, href: "/pro/calendar", group: "quotidien" },
  { id: "appointments", label: "Rendez-vous", icon: Users, href: "/pro/appointments", group: "quotidien" },
  { id: "messages", label: "Messagerie", icon: MessageSquare, href: "/pro/messages", group: "quotidien" },
  
  // Groupe 2: Gestion & Croissance
  { id: "profile", label: "Mon Profil Public", icon: UserCircle, href: "/pro/profile", group: "business" },
  { id: "events", label: "Événements", icon: CalendarDays, href: "/pro/events", group: "business" },
  { id: "marketing", label: "Marketing", icon: Megaphone, href: "/pro/marketing", group: "business" },
  { id: "boutique", label: "Boutique", icon: ShoppingBag, href: "/pro/boutique", group: "business" },
  { id: "analytics", label: "Statistiques", icon: BarChart3, href: "/pro/analytics", group: "business" },
  { id: "reviews", label: "Avis & Réputation", icon: Star, href: "/pro/reviews", group: "business" },
  
  // Groupe 3: Finance
  { id: "finance", label: "Finance & Factures", icon: Euro, href: "/pro/finance", group: "finance" },
  
  // Groupe 4: Config
  { id: "settings", label: "Paramètres", icon: Settings, href: "/pro/settings", group: "config" },
];

export default function ProLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const data = session?.data;

  // Récupérer le compte de notifications non lues
  const { data: notificationCount = 0 } = useQuery<number>({
    queryKey: ["notificationCount"],
    queryFn: async () => {
      if (!data?.user) return 0;
      const res = await fetch("/api/notifications/count");
      if (!res.ok) return 0;
      const countData = await res.json();
      return countData.count || 0;
    },
    enabled: !!data?.user,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Récupérer le nombre de rendez-vous en attente (doit être appelé avant tous les returns)
  const { data: pendingAppointmentsData } = useQuery<{ count: number }>({
    queryKey: ["pendingAppointments", data?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/pending-appointments");
      if (!res.ok) throw new Error("Failed to fetch pending appointments");
      return res.json();
    },
    enabled: !!data?.user?.id && data?.user?.role === "PRACTITIONER",
    refetchInterval: 30000, // Refetch toutes les 30 secondes
  });

  const pendingCount = pendingAppointmentsData?.count || 0;

  // Check if we're on the public landing page (/pro)
  const isPublicLandingPage = pathname === "/pro" || pathname === "/fr/pro" || pathname === "/en/pro";

  // Protection de route simplifiée - laissée à la page individuelle
  // Le middleware et la logique de page gèrent les redirections

  if (!session || session.status === 'loading') return <PageSkeleton />

  // If it's the public landing page, render without the dashboard layout
  if (isPublicLandingPage) {
    return <>{children}</>;
  }

  // For protected pages, require authentication and proper role (or claim in progress)
  if (!data) {
    return <PageSkeleton />;
  }

  // Vérifier s'il y a un cookie de réclamation
  const hasClaimCookie = (() => {
    if (typeof window === 'undefined') return false;
    const cookies = document.cookie.split(';');
    return cookies.some(cookie => cookie.trim().startsWith('holia_claim_id='));
  })();

  const isAdminViewAs = data.user.role === "ADMIN" && pathname === "/pro/dashboard";
  if (data.user.role !== "PRACTITIONER" && !hasClaimCookie && !isAdminViewAs) {
    console.log('[Pro Layout] Access denied for protected page');
    return null;
  }

  const activeItem = navItems.find(item => pathname?.startsWith(item.href))?.id || "dashboard";

  const groupedItems = {
    quotidien: navItems.filter(item => item.group === "quotidien"),
    business: navItems.filter(item => item.group === "business"),
    finance: navItems.filter(item => item.group === "finance"),
    config: navItems.filter(item => item.group === "config"),
  };

  return (
    <Suspense fallback={<Skeleton />}>
      <div className="min-h-screen bg-[#f7f7f7] flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-gray-100 fixed left-0 top-0 h-screen z-50">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-sauge rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-anthracite text-lg">Holia</h1>
              <span className="text-xs text-anthracite/60">PRO</span>
            </div>
          </div>
          <Button asChild className="w-full bg-sauge hover:bg-sauge-dark text-white">
            <Link href="/pro/appointments/new">
              <Plus className="h-4 w-4 mr-2" />
              Créer un RDV
            </Link>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Quotidien */}
          <div>
            <p className="text-xs font-semibold text-anthracite/40 uppercase tracking-wider mb-2 px-3">
              Quotidien
            </p>
            <div className="space-y-1">
              {groupedItems.quotidien.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                      isActive
                        ? "bg-sauge/10 text-anthracite border-l-4 border-sauge"
                        : "text-anthracite/70 hover:bg-[#f7f7f7]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Business */}
          <div>
            <p className="text-xs font-semibold text-anthracite/40 uppercase tracking-wider mb-2 px-3">
              Business
            </p>
            <div className="space-y-1">
              {groupedItems.business.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                      isActive
                        ? "bg-sauge/10 text-anthracite border-l-4 border-sauge"
                        : "text-anthracite/70 hover:bg-[#f7f7f7]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Finance */}
          <div>
            <p className="text-xs font-semibold text-anthracite/40 uppercase tracking-wider mb-2 px-3">
              Finance
            </p>
            <div className="space-y-1">
              {groupedItems.finance.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                      isActive
                        ? "bg-sauge/10 text-anthracite border-l-4 border-sauge"
                        : "text-anthracite/70 hover:bg-[#f7f7f7]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Config */}
          <div>
            <p className="text-xs font-semibold text-anthracite/40 uppercase tracking-wider mb-2 px-3">
              Config
            </p>
            <div className="space-y-1">
              {groupedItems.config.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                      isActive
                        ? "bg-sauge/10 text-anthracite border-l-4 border-sauge"
                        : "text-anthracite/70 hover:bg-[#f7f7f7]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-sauge/10 rounded-full flex items-center justify-center">
              <span className="text-sauge font-semibold text-sm">
                {data?.user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-anthracite truncate">
                {data?.user?.name || "Utilisateur"}
              </p>
              <p className="text-xs text-anthracite/60 truncate">{data?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2 text-anthracite/70 hover:bg-[#f7f7f7] rounded-2xl transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-2xl shadow-lg border border-gray-100"
        aria-label="Menu"
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <aside
            className="w-[280px] bg-white h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Same content as desktop sidebar */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-sauge rounded-2xl flex items-center justify-center">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <div>
                    <h1 className="font-heading font-bold text-anthracite text-lg">Holia</h1>
                    <span className="text-xs text-anthracite/60">PRO</span>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5 text-anthracite/70" />
                </button>
              </div>
              <Button asChild className="w-full bg-sauge hover:bg-sauge-dark text-white">
                <Link href="/pro/appointments/new" onClick={() => setMobileMenuOpen(false)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un RDV
                </Link>
              </Button>
            </div>
            {/* Navigation items same as desktop */}
            <nav className="p-4 space-y-6">
              {/* Quotidien */}
              <div>
                <p className="text-xs font-semibold text-anthracite/40 uppercase tracking-wider mb-2 px-3">
                  Quotidien
                </p>
                <div className="space-y-1">
                  {groupedItems.quotidien.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;
                    const showBadge = item.id === "appointments" && pendingCount > 0;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                          isActive
                            ? "bg-sauge/10 text-anthracite border-l-4 border-sauge"
                            : "text-anthracite/70 hover:bg-[#f7f7f7]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                        {showBadge && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {pendingCount > 9 ? "9+" : pendingCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Business */}
              <div>
                <p className="text-xs font-semibold text-anthracite/40 uppercase tracking-wider mb-2 px-3">
                  Business
                </p>
                <div className="space-y-1">
                  {groupedItems.business.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                          isActive
                            ? "bg-sauge/10 text-anthracite border-l-4 border-sauge"
                            : "text-anthracite/70 hover:bg-[#f7f7f7]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Finance */}
              <div>
                <p className="text-xs font-semibold text-anthracite/40 uppercase tracking-wider mb-2 px-3">
                  Finance
                </p>
                <div className="space-y-1">
                  {groupedItems.finance.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                          isActive
                            ? "bg-sauge/10 text-anthracite border-l-4 border-sauge"
                            : "text-anthracite/70 hover:bg-[#f7f7f7]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Config */}
              <div>
                <p className="text-xs font-semibold text-anthracite/40 uppercase tracking-wider mb-2 px-3">
                  Config
                </p>
                <div className="space-y-1">
                  {groupedItems.config.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                          isActive
                            ? "bg-sauge/10 text-anthracite border-l-4 border-sauge"
                            : "text-anthracite/70 hover:bg-[#f7f7f7]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </nav>

            {/* Footer Mobile */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 bg-sauge/10 rounded-full flex items-center justify-center">
                  <span className="text-sauge font-semibold text-sm">
                    {data?.user?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-anthracite truncate">
                    {data?.user?.name || "Utilisateur"}
                  </p>
                  <p className="text-xs text-anthracite/60 truncate">{data?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  signOut({ callbackUrl: "/" });
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-anthracite/70 hover:bg-[#f7f7f7] rounded-2xl transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Déconnexion</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-[280px] min-h-screen">
        {/* Top Bar with Back Button */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-[1600px] mx-auto px-6 2xl:px-16">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-anthracite/70 hover:text-anthracite transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm font-medium">Retour à l'application</span>
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/pro/dashboard"
                  className="flex items-center gap-2 text-anthracite/70 hover:text-anthracite transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  href="/pro/notifications"
                  className="flex items-center gap-2 text-anthracite/70 hover:text-anthracite transition-colors"
                >
                  <div className="relative">
                    <Bell className="h-4 w-4" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">Notifications</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        {children}
        <MiniFooter />
      </main>
      </div>
    </Suspense>
  );
}

