"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { DocTarget } from "@/lib/mdx";

interface DocCategory {
  id: string;
  label: string;
  articles: { slug: string; frontmatter: { title: string } }[];
}

export function AideSidebar({ profile }: { profile: DocTarget }) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<DocCategory[]>([]);

  useEffect(() => {
    fetch(`/api/aide/categories?profile=${profile}`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [profile]);

  return (
    <nav className="space-y-1">
      {categories.map((cat) => (
        <div key={cat.id} className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-anthracite/60 mb-2">
            {cat.label}
          </h3>
          <ul className="space-y-1">
            {cat.articles.map((art) => {
              const href = `/aide/${profile}/${cat.id}/${art.slug}`;
              const isActive = pathname === href;
              return (
                <li key={art.slug}>
                  <Link
                    href={href}
                    className={`block px-3 py-2 rounded-2xl text-sm transition-colors ${
                      isActive
                        ? "bg-sauge/20 text-sauge font-medium"
                        : "text-anthracite/80 hover:bg-sauge/10 hover:text-anthracite"
                    }`}
                  >
                    {art.frontmatter.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
