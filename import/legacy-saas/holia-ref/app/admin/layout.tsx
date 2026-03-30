"use client";

export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { BarChart3 } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { UserCheck } from "lucide-react";
import { Clock } from "lucide-react";
import { Users } from "lucide-react";
import { Calendar } from "lucide-react";
import { Euro } from "lucide-react";
import { Star } from "lucide-react";
import { FileText } from "lucide-react";
import { Shield } from "lucide-react";
import { LogOut } from "lucide-react";
import { Menu } from "lucide-react";
import { X } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Mail } from "lucide-react";
import { MiniFooter } from "@/components/mini-footer";
import { PageSkeleton } from "@/components/page-skeleton";

const adminMenuItems = [
  {
    group: "Pilotage",
    items: [
      {
        label: "Vue d'ensemble",
        href: "/admin/dashboard",
        icon: BarChart3,
      },
      {
        label: "Live Feed",
        href: "/admin/activity",
        icon: TrendingUp,
      },
    ],
  },
  {
    group: "Utilisateurs",
    items: [
      {
        label: "Praticiens",
        href: "/admin/practitioners",
        icon: UserCheck,
      },
      {
        label: "Queue de Validation",
        href: "/admin/practitioners/validation",
        icon: Clock,
        badge: true,
      },
      {
        label: "Patients",
        href: "/admin/users",
        icon: Users,
      },
      {
        label: "Réservations",
        href: "/admin/appointments",
        icon: Calendar,
      },
    ],
  },
  {
    group: "Finance",
    items: [
      {
        label: "Revenus Holia",
        href: "/admin/finance",
        icon: Euro,
      },
      {
        label: "Payouts",
        href: "/admin/payouts",
        icon: TrendingUp,
      },
      {
        label: "Alertes Remboursements",
        href: "/admin/refunds",
        icon: AlertTriangle,
        badge: true,
      },
    ],
  },
  {
    group: "Acquisition",
    items: [
      {
        label: "Shadow Profiles",
        href: "/admin/acquisition",
        icon: Mail,
      },
    ],
  },
  {
    group: "Contenu & SEO",
    items: [
      {
        label: "Avis & Modération",
        href: "/admin/reviews",
        icon: Star,
      },
      {
        label: "Catégories",
        href: "/admin/professions",
        icon: FileText,
      },
    ],
  },
  {
    group: "Système",
    items: [
      {
        label: "Administrateurs",
        href: "/admin/admins",
        icon: Shield,
      },
      {
        label: "Logs",
        href: "/admin/logs",
        icon: FileText,
      },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (data && data.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [data, router]);

  // Vérifier le statut de la session
  if (!session || session.status === 'loading') {
    return <PageSkeleton />;
  }

  if (session.status === 'unauthenticated' || !session.data) {
    return <PageSkeleton />;
  }

  if (data?.user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <p className="text-anthracite/70">Accès refusé. Redirection...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="min-h-screen bg-[#f7f7f7] flex">
      {/* Sidebar - Dark Mode */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-[#2f2f2f] text-white transition-all duration-300 fixed h-screen z-40 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#9bb49b]">Holia</span>
              {sidebarOpen && (
                <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                  ADMIN
                </span>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-white hover:text-[#9bb49b] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {adminMenuItems.map((group) => (
              <div key={group.group}>
                {sidebarOpen && (
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                    {group.group}
                  </h3>
                )}
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-2xl transition-colors ${
                            isActive
                              ? "bg-[#9bb49b] text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          }`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          {sidebarOpen && (
                            <>
                              <span className="flex-1">{item.label}</span>
                              {item.badge && (
                                <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full">
                                  !
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#9bb49b] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {data?.user?.name?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              {sidebarOpen && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {data?.user?.name || "Admin"}
                  </p>
                  <p className="text-xs text-gray-400">{data?.user?.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
              {sidebarOpen && <span>Déconnexion</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? "md:ml-64" : "md:ml-20"} transition-all duration-300`}>
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-anthracite hover:text-sauge transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-anthracite/70">
                Mode Admin
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex flex-col min-h-screen">
          <div className="flex-1">{children}</div>
          <MiniFooter />
        </main>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      </div>
    </Suspense>
  );
}
