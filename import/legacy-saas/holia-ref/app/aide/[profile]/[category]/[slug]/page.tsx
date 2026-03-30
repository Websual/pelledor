import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import { getArticle } from "@/lib/mdx";

const VALID_PROFILES = ["pro", "patient"];
const FALLBACK_TITLE = "[Titre de l'article] | Centre d'aide Holia";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ profile: string; category: string; slug: string }>;
}): Promise<Metadata> {
  const { profile, category: categoryId, slug } = await params;
  if (!VALID_PROFILES.includes(profile)) {
    return { title: FALLBACK_TITLE };
  }

  const article = getArticle(profile as "pro" | "patient", categoryId, slug);
  if (!article || article.frontmatter.target !== profile) {
    return { title: FALLBACK_TITLE };
  }

  const { title, description } = article.frontmatter;
  const pageTitle = title ? `${title} | Centre d'aide Holia` : FALLBACK_TITLE;

  return {
    title: pageTitle,
    description: description || undefined,
  };
}

const mdxOptions = { remarkPlugins: [remarkGfm] };

const mdxComponents = {
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} className="text-sauge hover:underline" target="_blank" rel="noopener noreferrer" />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-lg font-bold text-anthracite mt-6 mb-2 first:mt-0" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-base font-semibold text-anthracite mt-4 mb-2" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-anthracite/80 leading-relaxed my-2" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside space-y-1 my-4 text-anthracite/80" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside space-y-1 my-4 text-anthracite/80" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className="my-1" {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" {...props} />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-gray-50" {...props} />
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-anthracite uppercase tracking-wider"
      {...props}
    />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-3 text-sm text-anthracite/80 border-t border-gray-100" {...props} />
  ),
  tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className="divide-y divide-gray-100 bg-white" {...props} />
  ),
};

export default async function AideArticlePage({
  params,
}: {
  params: Promise<{ profile: string; category: string; slug: string }>;
}) {
  const { profile, category: categoryId, slug } = await params;
  if (!VALID_PROFILES.includes(profile)) notFound();

  const article = getArticle(profile as "pro" | "patient", categoryId, slug);
  if (!article || article.frontmatter.target !== profile) notFound();

  const categoryLabel = article.frontmatter.category;

  return (
    <article className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-8">
        <Link
          href={`/aide/${profile}`}
          className="inline-flex items-center gap-1 text-sm text-anthracite/60 hover:text-sauge mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Documentation
        </Link>
        <div className="mb-2 text-sm font-medium text-sauge">{categoryLabel}</div>
        <h1 className="text-2xl font-bold font-heading text-anthracite mb-8">
          {article.frontmatter.title}
        </h1>
        <div className="prose prose-slate max-w-none">
          <MDXRemote
            source={article.content}
            components={mdxComponents}
            options={{ mdxOptions }}
          />
        </div>
      </div>
      <div className="border-t border-gray-100 p-6 bg-[#FAF8F4]/50 rounded-b-3xl">
        <p className="text-sm text-anthracite/70 mb-3">
          Vous n&apos;avez pas trouvé la réponse à votre question ?
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sauge/10 text-sauge hover:bg-sauge/20 font-medium text-sm transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Contacter le support
        </Link>
      </div>
    </article>
  );
}
