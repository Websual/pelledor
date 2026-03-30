import Link from "next/link";
import { Metadata } from "next";

// Liste complète des professions avec leurs slugs
const allProfessions = [
  { name: "Naturopathe", slug: "naturopathe" },
  { name: "Sophrologue", slug: "sophrologue" },
  { name: "Hypnothérapeute", slug: "hypnotherapeute" },
  { name: "Ostéopathe", slug: "osteopathe" },
  { name: "Réflexologue", slug: "reflexologue" },
  { name: "Kinésithérapeute", slug: "kinesitherapeute" },
  { name: "Psychologue", slug: "psychologue" },
  { name: "Coach bien-être", slug: "coach-bien-etre" },
  { name: "Acupuncteur", slug: "acupuncteur" },
  { name: "Magnétiseur", slug: "magnetiseur" },
  { name: "Praticien Reiki", slug: "praticien-reiki" },
  { name: "Thérapeute", slug: "therapeute" },
];

// Régions françaises avec leurs principales villes
const frenchRegions = [
  { name: "Île-de-France", cities: ["Paris", "Boulogne-Billancourt", "Neuilly-sur-Seine", "Versailles"] },
  { name: "Provence-Alpes-Côte d'Azur", cities: ["Marseille", "Nice", "Toulon", "Aix-en-Provence"] },
  { name: "Auvergne-Rhône-Alpes", cities: ["Lyon", "Grenoble", "Saint-Étienne", "Villeurbanne"] },
  { name: "Occitanie", cities: ["Toulouse", "Montpellier", "Nîmes", "Perpignan"] },
  { name: "Nouvelle-Aquitaine", cities: ["Bordeaux", "Limoges", "Poitiers", "La Rochelle"] },
  { name: "Grand Est", cities: ["Strasbourg", "Reims", "Metz", "Mulhouse"] },
  { name: "Hauts-de-France", cities: ["Lille", "Amiens", "Roubaix", "Tourcoing"] },
  { name: "Normandie", cities: ["Rouen", "Caen", "Le Havre", "Cherbourg"] },
  { name: "Bretagne", cities: ["Rennes", "Brest", "Quimper", "Vannes"] },
  { name: "Pays de la Loire", cities: ["Nantes", "Angers", "Le Mans", "Saint-Nazaire"] },
  { name: "Centre-Val de Loire", cities: ["Orléans", "Tours", "Chartres", "Bourges"] },
  { name: "Bourgogne-Franche-Comté", cities: ["Dijon", "Besançon", "Metz", "Belfort"] },
  { name: "Corse", cities: ["Ajaccio", "Bastia", "Corte", "Calvi"] },
];

export const metadata: Metadata = {
  title: "Plan du site | Holia - Plateforme de bien-être",
  description: "Découvrez toutes les pages et rubriques de Holia. Trouvez des praticiens par profession et par région en France.",
  keywords: ["plan du site", "sitemap", "praticiens", "bien-être", "thérapies", "France"],
  openGraph: {
    title: "Plan du site | Holia",
    description: "Découvrez toutes les pages et rubriques de Holia. Trouvez des praticiens par profession et par région en France.",
    type: "website",
  },
};

export default function PlanDuSitePage() {
  return (
    <div className="min-h-screen bg-white pt-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#9bb49b]/10 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Plan du site
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Découvrez toutes les pages et rubriques de Holia. Trouvez facilement des praticiens
              par profession ou par région en France.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Navigation principale */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Navigation principale</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Accueil
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Page d'accueil de Holia
              </p>
            </Link>
            <Link
              href="/recherche"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Recherche de praticiens
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Trouvez un praticien près de chez vous
              </p>
            </Link>
            <Link
              href="/pro"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Devenir praticien
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Rejoignez la communauté Holia
              </p>
            </Link>
            <Link
              href="/inscription"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Inscription
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Créez votre compte patient ou praticien
              </p>
            </Link>
            <Link
              href="/connexion"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Connexion
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Accédez à votre compte
              </p>
            </Link>
            <Link
              href="/contact"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Contact
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Nous contacter
              </p>
            </Link>
          </div>
        </section>

        {/* Professions */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Toutes les professions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allProfessions.map((profession) => (
              <Link
                key={profession.slug}
                href={`/profession/${profession.slug}`}
                className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
              >
                <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                  {profession.name}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Trouvez un {profession.name.toLowerCase()} près de chez vous
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Régions françaises */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Régions françaises
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {frenchRegions.map((region) => (
              <div key={region.name} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {region.name}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {region.cities.map((city) => (
                    <Link
                      key={city}
                      href={`/recherche?city=${encodeURIComponent(city)}`}
                      className="p-3 bg-slate-50 rounded hover:bg-[#9bb49b]/10 transition-colors text-sm text-slate-700 hover:text-[#9bb49b] transition-colors"
                    >
                      {city}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Informations légales */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Informations légales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/mentions-legales"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Mentions légales
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Informations légales du site
              </p>
            </Link>
            <Link
              href="/cgu"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Conditions générales d'utilisation
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                CGU de la plateforme Holia
              </p>
            </Link>
            <Link
              href="/confidentialite"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Politique de confidentialité
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Protection de vos données
              </p>
            </Link>
            <Link
              href="/cookies"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                Gestion des cookies
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Préférences de cookies
              </p>
            </Link>
            <Link
              href="/a-propos"
              className="p-4 bg-slate-50 rounded-2xl hover:bg-[#9bb49b]/10 transition-colors group"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors">
                À propos
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Découvrez Holia
              </p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}