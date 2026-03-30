import type { Metadata } from "next";
import { absoluteSiteUrl, getMetadataBase } from "./public-url";

type PageBlockSeo = {
  pageSlug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
};

type EntitySeo = {
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
};

export function metadataForBuilderPage(
  page: PageBlockSeo,
  practitionerTitle: string,
  establishment: string
): Metadata {
  const displayTitle =
    page.metaTitle?.trim() ||
    `${page.pageSlug.charAt(0).toUpperCase()}${page.pageSlug.slice(1)} · ${practitionerTitle}`;
  const description = page.metaDescription?.trim() || undefined;
  const canonical =
    page.canonicalUrl?.trim() ||
    absoluteSiteUrl(establishment, page.pageSlug);
  const ogTitle = page.ogTitle?.trim() || page.metaTitle?.trim() || displayTitle;
  const ogDesc =
    page.ogDescription?.trim() || page.metaDescription?.trim() || undefined;
  const ogImage = page.ogImageUrl?.trim();

  return {
    title: displayTitle,
    description,
    metadataBase: getMetadataBase(),
    alternates: { canonical },
    robots: page.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDesc,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export function metadataForBlogPost(
  post: EntitySeo & { excerpt: string | null },
  establishment: string,
  slug: string
): Metadata {
  const displayTitle = post.metaTitle?.trim() || post.title;
  const description =
    post.metaDescription?.trim() || post.excerpt?.trim() || undefined;
  const canonical =
    post.canonicalUrl?.trim() ||
    absoluteSiteUrl(establishment, "blog", slug);
  const ogTitle = post.ogTitle?.trim() || displayTitle;
  const ogDesc =
    post.ogDescription?.trim() ||
    post.metaDescription?.trim() ||
    post.excerpt?.trim() ||
    undefined;
  const ogImage = post.ogImageUrl?.trim();

  return {
    title: displayTitle,
    description,
    metadataBase: getMetadataBase(),
    alternates: { canonical },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title: ogTitle,
      description: ogDesc,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDesc,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export function metadataForPortfolioProject(
  project: EntitySeo & { summary: string | null },
  establishment: string,
  slug: string
): Metadata {
  const displayTitle = project.metaTitle?.trim() || project.title;
  const description =
    project.metaDescription?.trim() || project.summary?.trim() || undefined;
  const canonical =
    project.canonicalUrl?.trim() ||
    absoluteSiteUrl(establishment, "portfolio", slug);
  const ogTitle = project.ogTitle?.trim() || displayTitle;
  const ogDesc =
    project.ogDescription?.trim() ||
    project.metaDescription?.trim() ||
    project.summary?.trim() ||
    undefined;
  const ogImage = project.ogImageUrl?.trim();

  return {
    title: displayTitle,
    description,
    metadataBase: getMetadataBase(),
    alternates: { canonical },
    robots: project.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDesc,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export function metadataForBlogIndex(
  establishment: string,
  siteTitle: string
): Metadata {
  const title = `Blog · ${siteTitle}`;
  return {
    title,
    description: `Articles — ${siteTitle}`,
    metadataBase: getMetadataBase(),
    alternates: { canonical: absoluteSiteUrl(establishment, "blog") },
    openGraph: {
      title,
      url: absoluteSiteUrl(establishment, "blog"),
    },
  };
}

export function metadataForPortfolioIndex(
  establishment: string,
  siteTitle: string
): Metadata {
  const title = `Réalisations · ${siteTitle}`;
  return {
    title,
    description: `Portfolio — ${siteTitle}`,
    metadataBase: getMetadataBase(),
    alternates: { canonical: absoluteSiteUrl(establishment, "portfolio") },
    openGraph: {
      title,
      url: absoluteSiteUrl(establishment, "portfolio"),
    },
  };
}
