"use client";

import { usePathname } from "next/navigation";
import { FloatingNavbar } from "@/components/floating-navbar";

export function NavbarWrapper() {
  const pathname = usePathname();
  // Afficher uniquement sur /pro exactement (onboarding), pas sur /pro/* (sous-routes)
  const isProExact = pathname === '/pro';
  const isProSubRoute = pathname?.startsWith('/pro/');
  const isAdminRoute = pathname?.startsWith('/admin/') || pathname === '/admin';

  // Cacher sur les sous-routes /pro/* et /admin/*
  if (isProSubRoute || isAdminRoute) {
    return null;
  }

  // Afficher sur /pro exactement et toutes les autres pages
  return <FloatingNavbar />;
}