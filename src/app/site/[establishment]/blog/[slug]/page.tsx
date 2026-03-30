import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/core/cms/article-body";
import { getDb } from "@/core/db/server";
import { cmsBlogPosts, practitioners } from "@/core/db/schema.modules";
import { metadataForBlogPost } from "@/core/seo/build-metadata";
import { JsonLdBlogPosting } from "@/core/seo/json-ld";
import { absoluteSiteUrl } from "@/core/seo/public-url";
import { and, eq, isNotNull } from "drizzle-orm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ establishment: string; slug: string }>;
}): Promise<Metadata> {
  const { establishment, slug } = await params;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) return {};
  const post = await db.query.cmsBlogPosts.findFirst({
    where: and(
      eq(cmsBlogPosts.practitionerId, p.id),
      eq(cmsBlogPosts.slug, slug),
      isNotNull(cmsBlogPosts.publishedAt)
    ),
  });
  if (!post) return { title: "Article" };
  return metadataForBlogPost(
    {
      title: post.title,
      excerpt: post.excerpt,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      canonicalUrl: post.canonicalUrl,
      ogTitle: post.ogTitle,
      ogDescription: post.ogDescription,
      ogImageUrl: post.ogImageUrl,
      noindex: post.noindex,
    },
    establishment,
    slug
  );
}

export default async function SiteBlogArticlePage({
  params,
}: {
  params: Promise<{ establishment: string; slug: string }>;
}) {
  const { establishment, slug } = await params;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) notFound();

  const post = await db.query.cmsBlogPosts.findFirst({
    where: and(
      eq(cmsBlogPosts.practitionerId, p.id),
      eq(cmsBlogPosts.slug, slug),
      isNotNull(cmsBlogPosts.publishedAt)
    ),
  });
  if (!post) notFound();

  const base = `/site/${establishment}`;
  const pageUrl = absoluteSiteUrl(establishment, "blog", slug);
  const publisherUrl = p.publicSiteUrl?.trim() || absoluteSiteUrl(establishment, "home");
  const ogImage = post.ogImageUrl?.trim() || post.coverImageUrl?.trim() || null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <JsonLdBlogPosting
        headline={post.metaTitle?.trim() || post.title}
        url={pageUrl}
        datePublished={post.publishedAt}
        dateModified={post.updatedAt}
        image={ogImage}
        description={post.metaDescription?.trim() || post.excerpt?.trim() || null}
        publisherName={p.title || establishment}
        publisherUrl={publisherUrl}
      />
      <Link href={`${base}/blog`} className="text-sm text-gray-500 hover:text-gray-800">
        ← Blog
      </Link>
      <article className="mt-6">
        <h1 className="text-3xl font-light tracking-tight text-gray-900">{post.title}</h1>
        {post.publishedAt && (
          <time
            className="mt-2 block text-sm text-gray-400"
            dateTime={post.publishedAt.toISOString()}
          >
            {post.publishedAt.toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        )}
        {post.coverImageUrl && (
          <img
            src={post.coverImageUrl}
            alt=""
            className="mt-8 aspect-[2/1] w-full rounded-xl object-cover"
          />
        )}
        {post.excerpt && (
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">{post.excerpt}</p>
        )}
        <div className="mt-10">
          <ArticleBody bodyHtml={post.bodyHtml} bodyDocument={post.bodyDocument} />
        </div>
      </article>
    </main>
  );
}
