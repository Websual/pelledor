"use client";

import { Building2, User, FileText, GraduationCap, MessageSquare, Home } from "lucide-react";
import { useState, useEffect } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "hero", label: "Haut de page", icon: Home },
  { id: "cabinet", label: "Le Cabinet", icon: Building2 },
  { id: "about", label: "À propos", icon: User },
  { id: "prestations", label: "Prestations", icon: FileText },
  { id: "parcours", label: "Parcours", icon: GraduationCap },
  { id: "avis", label: "Avis", icon: MessageSquare },
];

export function PractitionerSidebarNav() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const threshold = viewportHeight * 0.3; // 30% du viewport depuis le haut

      // Si on est tout en haut, activer "hero"
      if (scrollY < 150) {
        setActiveItem("hero");
        return;
      }

      // Trouver la section actuellement visible
      let currentActive: string | null = null;
      let maxVisibleArea = 0;

      // Parcourir toutes les sections et trouver celle qui est la plus visible
      for (const item of navItems) {
        const element = document.getElementById(item.id);
        
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + scrollY;
          const elementBottom = elementTop + rect.height;
          
          // Calculer la zone visible de cette section
          const visibleTop = Math.max(scrollY + threshold, elementTop);
          const visibleBottom = Math.min(scrollY + viewportHeight, elementBottom);
          const visibleArea = Math.max(0, visibleBottom - visibleTop);
          
          // Si cette section est visible et a une plus grande zone visible que la précédente
          if (visibleArea > 0 && visibleArea > maxVisibleArea) {
            maxVisibleArea = visibleArea;
            currentActive = item.id;
          }
        }
      }

      // Si aucune section n'est trouvée mais qu'on a scrollé, activer la dernière
      if (!currentActive && scrollY > 200) {
        // Trouver la section la plus proche du haut du viewport
        for (let i = navItems.length - 1; i >= 0; i--) {
          const item = navItems[i];
          const element = document.getElementById(item.id);
          
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= threshold + 100) {
              currentActive = item.id;
              break;
            }
          }
        }
      }

      setActiveItem(currentActive || "hero");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Appel initial

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (id: string) => {
    if (id === "hero") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Offset pour le menu flottant
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <nav className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-40">
      <div className="bg-white rounded-2xl shadow-lg p-3">
        <div className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isHovered = hoveredItem === item.id;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className="relative group flex items-center gap-3 p-2 rounded-2xl hover:bg-[#f7f7f7] transition-colors"
                aria-label={item.label}
              >
                {/* Point */}
                <div
                  className={`rounded-full transition-all ${
                    isActive
                      ? "w-3 h-3 bg-sauge scale-125"
                      : isHovered
                      ? "w-2 h-2 bg-sauge scale-150"
                      : "w-2 h-2 bg-anthracite/30"
                  }`}
                />
                
                {/* Label (visible on hover) */}
                {isHovered && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-anthracite text-white text-sm font-medium rounded-2xl whitespace-nowrap shadow-lg pointer-events-none">
                    {item.label}
                    {/* Arrow */}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-r-4 border-r-anthracite border-b-4 border-b-transparent" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

