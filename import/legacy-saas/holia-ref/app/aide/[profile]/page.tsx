import { notFound } from "next/navigation";
import Link from "next/link";
import { listArticlesByProfile } from "@/lib/mdx";

const VALID_PROFILES = ["pro", "patient"];

export default async function AideProfilePage({
  params,
}: {
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;
  if (!VALID_PROFILES.includes(profile)) notFound();

  const categories = listArticlesByProfile(profile as "pro" | "patient");

  if (categories.length > 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-heading text-anthracite mb-2">
            {profile === "pro" ? "Documentation Praticien" : "Documentation Patient"}
          </h1>
          <p className="text-anthracite/70">
            Explorez les catégories dans la barre latérale ou utilisez la recherche pour trouver une réponse.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/aide/${profile}/${cat.id}/${cat.articles[0].slug}`}
              className="block p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-sauge/20 transition-all"
            >
              <h2 className="font-semibold text-anthracite mb-2">{cat.label}</h2>
              <p className="text-sm text-anthracite/60">
                {cat.articles.length} article{cat.articles.length > 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <p className="text-anthracite/70">Aucun article disponible pour ce profil.</p>
    </div>
  );
}
