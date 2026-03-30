import Link from "next/link";
import Image from "next/image";
import { listBlogPosts } from "@/lib/blog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Holia - Bien-être & Santé holistique",
  description:
    "Conseils, inspirations et actualités pour une approche holistique du bien-être. Nutrition, santé mentale, médecines douces.",
};

type BlogPageProps = {
  searchParams?: Promise<{ category?: string }> | { category?: string };
};

export default async function BlogPage(props: BlogPageProps) {
  const rawParams = props.searchParams;
  const searchParams = rawParams && typeof (rawParams as Promise<unknown>).then === "function"
    ? await (rawParams as Promise<{ category?: string }>)
    : (rawParams as { category?: string } | undefined);
  const categoryParam = searchParams?.category;

  const allPosts = listBlogPosts();
  const categories = Array.from(
    new Set(allPosts.map((p) => p.frontmatter.category).filter(Boolean))
  ).sort() as string[];

  const selectedCategory = categoryParam ? decodeURIComponent(categoryParam) : null;
  const posts = selectedCategory
    ? allPosts.filter((p) => p.frontmatter.category === selectedCategory)
    : allPosts;

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-28">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-4">
            Blog Holia
          </h1>
          <p className="text-lg text-anthracite/70 max-w-2xl">
            Conseils, inspirations et actualités pour une approche holistique du
            bien-être et de la santé.
          </p>
        </header>

        {/* Filtres par catégorie */}
        <nav className="mb-10 flex flex-wrap gap-2" aria-label="Filtrer par catégorie">
          <Link
            href="/blog"
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? "bg-[#9bb49b] text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Tous
          </Link>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <Link
                key={cat}
                href={`/blog?category=${encodeURIComponent(cat)}`}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#9bb49b] text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-slate-200 transition-all duration-300"
            >
              {/* Image paysage, arrondi 3xl, zoom léger au survol */}
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
                {/* Header : date • lecture X min */}
                <p className="text-xs text-slate-400">
                  <time dateTime={post.frontmatter.date}>
                    {format(new Date(post.frontmatter.date), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </time>
                  {" • "}
                  Lecture {post.frontmatter.readingTime || 0} min
                </p>
                {/* Titre */}
                <h2 className="mt-2 text-xl font-bold text-slate-900 line-clamp-2 group-hover:text-slate-800">
                  {post.frontmatter.title}
                </h2>
                {/* Extrait (3 lignes max) */}
                <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {post.frontmatter.excerpt || post.frontmatter.description}
                </p>
                {/* Footer : catégorie + lien */}
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

        {posts.length === 0 && (
          <div className="text-center py-16 text-anthracite/70">
            <p>Aucun article pour le moment.</p>
          </div>
        )}
      </div>
    </main>
  );
}
