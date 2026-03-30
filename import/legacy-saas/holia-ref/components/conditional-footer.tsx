"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  const isProSubRoute = pathname?.startsWith('/pro/');
  const isAdminRoute = pathname?.startsWith('/admin/') || pathname === '/admin';

  if (isProSubRoute || isAdminRoute) {
    return null;
  }

  return <Footer />;
}
