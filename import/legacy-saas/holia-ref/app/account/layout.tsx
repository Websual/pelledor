"use client";

export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { AccountSidebar } from "@/components/account-sidebar";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <Suspense fallback={<Skeleton />}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-6 md:pb-8">
          {/* Mobile menu button */}
          <div className="md:hidden mb-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#f1f5f1] text-gray-700 hover:bg-[#f1f5f1] transition-colors"
            >
              {isMobileMenuOpen ? (
                <>
                  <X className="h-5 w-5" />
                  <span>Fermer</span>
                </>
              ) : (
                <>
                  <Menu className="h-5 w-5" />
                  <span>Menu</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Overlay pour mobile */}
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 bg-black/20 z-40 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {/* Sidebar - Desktop: fixe à gauche, Mobile: tiroir */}
            <div
              className={`
                ${isMobileMenuOpen ? "block" : "hidden"} 
                md:block
                fixed md:relative
                left-0 top-0 md:inset-auto
                h-full md:h-auto
                w-64 md:w-auto
                z-50 md:z-auto
                bg-white md:bg-transparent
                p-4 md:p-0
                overflow-y-auto md:overflow-visible
                shadow-lg md:shadow-none
              `}
            >
              <div className="md:sticky md:top-28">
                <AccountSidebar />
              </div>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-3xl border border-[#f1f5f1] p-6 md:p-8">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}