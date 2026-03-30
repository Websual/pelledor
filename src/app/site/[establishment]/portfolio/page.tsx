import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/core/db/server";
import { cmsPortfolioProjects, practitioners } from "@/core/db/schema.modules";
import { metadataForPortfolioIndex } from "@/core/seo/build-metadata";
import { asc, and, eq, isNotNull } from "drizzle-orm";

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
  return metadataForPortfolioIndex(establishment, p.title || establishment);
}

export default async function SitePortfolioIndexPage({
  params,
}: {
  params: Promise<{ establishment: string }>;
}) {
  const { establishment } = await params;
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.slug, establishment),
  });
  if (!p) notFound();

  const projects = await db
    .select({
      slug: cmsPortfolioProjects.slug,
      title: cmsPortfolioProjects.title,
      summary: cmsPortfolioProjects.summary,
      coverImageUrl: cmsPortfolioProjects.coverImageUrl,
    })
    .from(cmsPortfolioProjects)
    .where(
      and(
        eq(cmsPortfolioProjects.practitionerId, p.id),
        isNotNull(cmsPortfolioProjects.publishedAt)
      )
    )
    .orderBy(asc(cmsPortfolioProjects.sortOrder), asc(cmsPortfolioProjects.title));

  const base = `/site/${establishment}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-light text-gray-900">Réalisations</h1>
      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {projects.map((proj) => (
          <Link
            key={proj.slug}
            href={`${base}/portfolio/${proj.slug}`}
            className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
          >
            {proj.coverImageUrl ? (
              <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <img
                  src={proj.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-105 duration-500"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] w-full bg-gray-100" />
            )}
            <div className="p-5">
              <h2 className="text-lg font-medium text-gray-900 group-hover:underline">
                {proj.title}
              </h2>
              {proj.summary && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-3">{proj.summary}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
      {projects.length === 0 && (
        <p className="mt-12 text-center text-gray-400">Aucun projet publié.</p>
      )}
    </main>
  );
}
