import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/core/cms/article-body";
import { getDb } from "@/core/db/server";
import { cmsPortfolioProjects, practitioners } from "@/core/db/schema.modules";
import { metadataForPortfolioProject } from "@/core/seo/build-metadata";
import { JsonLdCreativeWork } from "@/core/seo/json-ld";
import { absoluteSiteUrl } from "@/core/seo/public-url";
import { and, eq, isNotNull } from "drizzle-orm";

type GalleryItem = { src: string; alt?: string };

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
  const project = await db.query.cmsPortfolioProjects.findFirst({
    where: and(
      eq(cmsPortfolioProjects.practitionerId, p.id),
      eq(cmsPortfolioProjects.slug, slug),
      isNotNull(cmsPortfolioProjects.publishedAt)
    ),
  });
  if (!project) return { title: "Réalisation" };
  return metadataForPortfolioProject(
    {
      title: project.title,
      summary: project.summary,
      metaTitle: project.metaTitle,
      metaDescription: project.metaDescription,
      canonicalUrl: project.canonicalUrl,
      ogTitle: project.ogTitle,
      ogDescription: project.ogDescription,
      ogImageUrl: project.ogImageUrl,
      noindex: project.noindex,
    },
    establishment,
    slug
  );
}

export default async function SitePortfolioProjectPage({
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

  const project = await db.query.cmsPortfolioProjects.findFirst({
    where: and(
      eq(cmsPortfolioProjects.practitionerId, p.id),
      eq(cmsPortfolioProjects.slug, slug),
      isNotNull(cmsPortfolioProjects.publishedAt)
    ),
  });
  if (!project) notFound();

  const base = `/site/${establishment}`;
  const gallery = (project.gallery as GalleryItem[] | null) ?? [];
  const pageUrl = absoluteSiteUrl(establishment, "portfolio", slug);
  const ogImage = project.ogImageUrl?.trim() || project.coverImageUrl?.trim() || null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <JsonLdCreativeWork
        name={project.metaTitle?.trim() || project.title}
        url={pageUrl}
        description={
          project.metaDescription?.trim() || project.summary?.trim() || null
        }
        image={ogImage}
      />
      <Link href={`${base}/portfolio`} className="text-sm text-gray-500 hover:text-gray-800">
        ← Réalisations
      </Link>
      <article className="mt-6">
        <h1 className="text-3xl font-light tracking-tight text-gray-900">{project.title}</h1>
        {(project.clientName || project.roleLabel) && (
          <p className="mt-2 text-sm text-gray-500">
            {[project.clientName, project.roleLabel].filter(Boolean).join(" · ")}
          </p>
        )}
        {project.externalUrl && (
          <a
            href={project.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline"
          >
            Voir le lien externe
          </a>
        )}
        {project.coverImageUrl && (
          <img
            src={project.coverImageUrl}
            alt=""
            className="mt-8 aspect-[2/1] w-full rounded-xl object-cover"
          />
        )}
        {project.summary && (
          <p className="mt-8 text-lg text-gray-600 leading-relaxed">{project.summary}</p>
        )}
        <div className="mt-10">
          <ArticleBody
            bodyHtml={project.descriptionHtml}
            bodyDocument={project.descriptionDocument}
          />
        </div>
        {gallery.length > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((img, i) => (
              <img
                key={`${img.src}-${i}`}
                src={img.src}
                alt={img.alt ?? ""}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
