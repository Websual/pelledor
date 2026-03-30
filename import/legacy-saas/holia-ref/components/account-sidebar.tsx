"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Calendar, User, Heart, MessageSquare, Settings, LayoutDashboard, Star, Bell, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    href: "/account/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
  },
  {
    href: "/account/appointments",
    label: "Mes rendez-vous",
    icon: Calendar,
  },
  {
    href: "/account/events",
    label: "Mes événements",
    icon: Ticket,
  },
  {
    href: "/account/reviews",
    label: "Mes avis",
    icon: Star,
  },
  {
    href: "/account/favorites",
    label: "Mes favoris",
    icon: Heart,
  },
  {
    href: "/account/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/account/messages",
    label: "Mes messages",
    icon: MessageSquare,
  },
  {
    href: "/account/profile",
    label: "Mon profil",
    icon: User,
  },
  {
    href: "/account/settings",
    label: "Paramètres",
    icon: Settings,
  },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 flex-shrink-0">
      <nav className="bg-white rounded-3xl border border-[#f1f5f1] p-4 md:p-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                    isActive
                      ? "bg-[#9bb49b]/10 text-[#9bb49b] font-medium border-l-[3px] border-[#9bb49b]"
                      : "text-gray-700 hover:bg-[#f1f5f1] hover:text-[#9bb49b]"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm md:text-base">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
