"use client";

import { usePathname } from "next/navigation";
import CookieConsent from "@/components/cookie-consent";
import { FloatingNavbar } from "@/components/floating-navbar";
import { Footer } from "@/components/footer";



export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPitchDeck = pathname?.includes("/pitch-deck");
  // Check if it's the public landing page /pro (not the dashboard pages)
  const isProLandingPage = pathname === "/pro" || pathname === "/pro" || pathname === "/en/pro";
  const isProDashboard = pathname?.startsWith("/pro") && !isProLandingPage;
  const isAdminDashboard = pathname?.startsWith("/admin");

  // Hide navbar and footer for pitch deck, pro dashboard, and admin dashboard (but show for landing page)
  if (isPitchDeck || isProDashboard || isAdminDashboard) {
    return (
      <>
        {children}
        <CookieConsent />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <FloatingNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
}

