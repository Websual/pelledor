import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/core/db/server";
import {
  cmsBlogCategories,
  cmsBlogPosts,
  practitioners,
} from "@/core/db/schema.modules";
import { metadataForBlogIndex } from "@/core/seo/build-metadata";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ establishment: string }>;
}): Promise<Metadata> {
  const { establishment } = await params;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) return {};
  return metadataForBlogIndex(establishment, p.title || establishment);
}

export default async function SiteBlogIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ establishment: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { establishment } = await params;
  const { category: categorySlug } = await searchParams;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) notFound();

  let categoryId: string | undefined;
  if (categorySlug) {
    const cat = await db.query.cmsBlogCategories.findFirst({
      where: and(
        eq(cmsBlogCategories.practitionerId, p.id),
        eq(cmsBlogCategories.slug, categorySlug)
      ),
    });
    categoryId = cat?.id;
  }

  const conds = [
    eq(cmsBlogPosts.practitionerId, p.id),
    isNotNull(cmsBlogPosts.publishedAt),
  ];
  if (categoryId) conds.push(eq(cmsBlogPosts.categoryId, categoryId));

  const posts = await db
    .select({
      slug: cmsBlogPosts.slug,
      title: cmsBlogPosts.title,
      excerpt: cmsBlogPosts.excerpt,
      coverImageUrl: cmsBlogPosts.coverImageUrl,
      publishedAt: cmsBlogPosts.publishedAt,
    })
    .from(cmsBlogPosts)
    .where(and(...conds))
    .orderBy(desc(cmsBlogPosts.publishedAt));

  const categories = await db
    .select({ slug: cmsBlogCategories.slug, name: cmsBlogCategories.name })
    .from(cmsBlogCategories)
    .where(eq(cmsBlogCategories.practitionerId, p.id))
    .orderBy(asc(cmsBlogCategories.sortOrder), asc(cmsBlogCategories.name));

  const base = `/site/${establishment}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-light text-gray-900">Blog</h1>
      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <Link
            href={`${base}/blog`}
            className={`rounded-full border px-3 py-1 ${
              !categorySlug ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600"
            }`}
          >
            Tout
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`${base}/blog?category=${encodeURIComponent(c.slug)}`}
              className={`rounded-full border px-3 py-1 ${
                categorySlug === c.slug
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <ul className="mt-10 space-y-10">
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-gray-100 pb-10">
            <Link href={`${base}/blog/${post.slug}`} className="group block">
              {post.coverImageUrl && (
                <img
                  src={post.coverImageUrl}
                  alt=""
                  className="mb-4 aspect-[2/1] w-full rounded-xl object-cover"
                />
              )}
              <h2 className="text-xl font-medium text-gray-900 group-hover:underline">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{post.excerpt}</p>
              )}
              {post.publishedAt && (
                <time
                  className="mt-3 block text-xs text-gray-400"
                  dateTime={post.publishedAt.toISOString()}
                >
                  {post.publishedAt.toLocaleDateString("fr-FR")}
                </time>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {posts.length === 0 && (
        <p className="mt-12 text-center text-gray-400">Aucun article pour le moment.</p>
      )}
    </main>
  );
}
