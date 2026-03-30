"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AideSidebar } from "@/components/aide-sidebar";
import { AideSearch } from "@/components/aide-search";
import type { DocTarget } from "@/lib/mdx";

export function AideLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/aide" || pathname === "/aide/";
  const profile = pathname.startsWith("/aide/pro")
    ? ("pro" as DocTarget)
    : pathname.startsWith("/aide/patient")
      ? ("patient" as DocTarget)
      : null;

  if (isHome) {
    return <div className="space-y-10">{children}</div>;
  }

  return (
    <div className="flex flex-col gap-12 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:border-r border-gray-100 lg:pr-8">
        <Link
          href="/aide"
          className="inline-flex items-center gap-2 text-sm font-medium text-anthracite/70 hover:text-sauge transition-colors mb-6"
        >
          <span aria-hidden>←</span>
          Retour aux catégories
        </Link>
        <div className="mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-anthracite hover:text-sauge transition-colors"
          >
            <span className="text-xl font-bold font-heading text-sauge">Holia</span>
            <span className="text-sm uppercase tracking-wide text-anthracite/60">
              Centre d&apos;aide
            </span>
          </Link>
        </div>
        {profile && <AideSidebar profile={profile} />}
      </aside>
      <main className="min-w-0 space-y-10">
        {profile && <AideSearch profile={profile} />}
        <div className="space-y-8">{children}</div>
      </main>
    </div>
  );
}
