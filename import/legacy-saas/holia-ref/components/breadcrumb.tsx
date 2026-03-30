"use client";
import Link from "next/link";

import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-anthracite/70 mb-6" aria-label="Breadcrumb">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-anthracite transition-colors"
      >
        <Home className="h-4 w-4" />
        <span>Accueil</span>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-anthracite/40" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-anthracite transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-anthracite font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

