import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import { getBlogPost, getAllBlogSlugs, getPrevNextPost } from "@/lib/blog";
import { transformMdxWithProfessionLinks } from "@/lib/blog-profession-links";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AdBanner } from "@/components/ui/AdBanner";

const BASE_TITLE = "Blog | Holia";

/** Slot AdSense In-Article pour le blog */
const BLOG_AD_SLOT = "1935546816";

/**
 * Injecte <AdBanner /> au milieu du contenu MDX (après le 2e H2, ou à 50 % du texte si moins de 2 H2).
 * Permet d'afficher la pub sans modifier chaque fichier .mdx.
 */
function injectAdInMdxContent(content: string): string {
  const marker = "\n## ";
  const first = content.indexOf(marker);
  const second = first === -1 ? -1 : content.indexOf(marker, first + 1);
  const insertPosition =
    second !== -1
      ? second
      : first !== -1
        ? first
        : Math.floor(content.length / 2);
  const before = content.slice(0, insertPosition);
  const after = content.slice(insertPosition);
  return `${before}\n\n<AdBanner dataAdSlot="${BLOG_AD_SLOT}" dataAdFormat="fluid" dataFullWidthResponsive />\n\n${after}`;
}

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: BASE_TITLE };

  const { title, description } = post.frontmatter;
  return {
    title: title ? `${title} | ${BASE_TITLE}` : BASE_TITLE,
    description: description || undefined,
  };
}

const mdxComponents = {
  AdBanner: () => (
    <div className="my-8 py-8">
      <AdBanner
        dataAdSlot={BLOG_AD_SLOT}
        dataAdFormat="fluid"
        dataFullWidthResponsive
      />
    </div>
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const { href, children, ...rest } = props;
    const isInternal = href?.startsWith("/");
    if (isInternal && href) {
      return (
        <Link href={href} className="text-sauge hover:underline" {...rest}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className="text-sauge hover:underline"
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  },
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-xl font-bold text-anthracite mt-8 mb-3 first:mt-0" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-lg font-semibold text-anthracite mt-6 mb-2" {...props} />
  ),
};

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const { prev, next } = getPrevNextPost(slug);
  const contentWithLinks = transformMdxWithProfessionLinks(post.content);
  const contentWithAd = injectAdInMdxContent(contentWithLinks);

  const imageSrc = post.frontmatter.image || "/images/hero-wellness.webp";

  return (
    <main className="min-h-screen bg-[#f7f7f7] py-16 pt-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12 lg:p-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-anthracite/60 hover:text-sauge mb-8 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour au blog
          </Link>

          <article>
            <header className="mb-10">
              <span className="inline-block px-3 py-1 rounded-full bg-sauge/10 text-sauge text-sm font-medium mb-4">
                {post.frontmatter.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold font-heading text-anthracite leading-tight">
                {post.frontmatter.title}
              </h1>
              <time
                dateTime={post.frontmatter.date}
                className="block mt-4 text-anthracite/60"
              >
                {format(new Date(post.frontmatter.date), "d MMMM yyyy", {
                  locale: fr,
                })}
              </time>
            </header>

            <div className="relative aspect-[21/9] rounded-3xl overflow-hidden mb-12">
              <Image
                src={imageSrc}
                alt={post.frontmatter.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                priority
              />
            </div>

            <div
              className="prose prose-slate lg:prose-xl max-w-none font-sans leading-relaxed prose-headings:text-anthracite prose-p:text-anthracite/80 prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-sauge prose-strong:text-anthracite"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              <MDXRemote source={contentWithAd} components={mdxComponents} />
            </div>
          </article>

          {/* Lire aussi — Navigation articles */}
          {(prev || next) && (
            <nav
              className="mt-16 pt-12 border-t border-gray-100"
              aria-label="Navigation entre articles"
            >
              <h2 className="text-lg font-semibold text-anthracite mb-6">
                Lire aussi
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {prev && (
                  <Link
                    href={`/blog/${prev.slug}`}
                    className="group flex gap-4 p-4 rounded-2xl border border-gray-100 hover:border-sauge/30 hover:bg-sauge/5 transition-all"
                  >
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      <Image
                        src={
                          prev.frontmatter.image || "/images/hero-wellness.webp"
                        }
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="80px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-anthracite/60 uppercase tracking-wide">
                        Article précédent
                      </span>
                      <p className="mt-1 font-semibold text-anthracite group-hover:text-sauge transition-colors line-clamp-2">
                        {prev.frontmatter.title}
                      </p>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-anthracite/40 self-center flex-shrink-0" />
                  </Link>
                )}

                {next && (
                  <Link
                    href={`/blog/${next.slug}`}
                    className="group flex gap-4 p-4 rounded-2xl border border-gray-100 hover:border-sauge/30 hover:bg-sauge/5 transition-all"
                  >
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      <Image
                        src={
                          next.frontmatter.image || "/images/hero-wellness.webp"
                        }
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="80px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-anthracite/60 uppercase tracking-wide">
                        Article suivant
                      </span>
                      <p className="mt-1 font-semibold text-anthracite group-hover:text-sauge transition-colors line-clamp-2">
                        {next.frontmatter.title}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-anthracite/40 self-center flex-shrink-0" />
                  </Link>
                )}
              </div>
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}
