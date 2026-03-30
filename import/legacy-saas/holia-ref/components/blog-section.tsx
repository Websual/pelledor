"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { BlogFrontmatter } from "@/lib/blog";

export type BlogSectionPost = {
  slug: string;
  frontmatter: BlogFrontmatter;
};

interface BlogSectionProps {
  title: string;
  posts: BlogSectionPost[];
  /** Lien optionnel sous le titre (ex. "Voir tout" vers /blog) */
  linkUrl?: string;
  linkLabel?: string;
  /** Fond de la section : "default" (gris clair) ou "white" */
  background?: "default" | "white";
}

export function BlogSection({ title, posts, linkUrl, linkLabel, background = "default" }: BlogSectionProps) {
  if (posts.length === 0) return null;

  return (
    <section className={`py-16 lg:py-20 overflow-hidden ${background === "white" ? "bg-white" : "bg-[#f7f7f7]"}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            {title}
          </h2>
          {linkUrl && linkLabel && (
            <Link
              href={linkUrl}
              className="text-sm font-medium text-[#9bb49b] hover:text-[#8aa48a] transition-colors shrink-0"
            >
              {linkLabel}
            </Link>
          )}
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-slate-200 transition-all duration-300"
            >
              <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden rounded-t-3xl">
                <Image
                  src={post.frontmatter.image || "/images/hero-wellness.webp"}
                  alt={post.frontmatter.title}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <div className="p-6 pt-5">
                <p className="text-xs text-slate-400">
                  <time dateTime={post.frontmatter.date}>
                    {format(new Date(post.frontmatter.date), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </time>
                  {" • "}
                  Lecture {post.frontmatter.readingTime ?? 0} min
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900 line-clamp-2 group-hover:text-slate-800">
                  {post.frontmatter.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {post.frontmatter.excerpt || post.frontmatter.description}
                </p>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-2xl text-xs font-medium bg-[#9bb49b]/15 text-[#9bb49b]">
                    {post.frontmatter.category}
                  </span>
                  <span className="text-sm font-medium text-slate-500 group-hover:text-slate-900 transition-colors shrink-0">
                    Lire l'article →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
