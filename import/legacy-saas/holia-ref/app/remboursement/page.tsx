import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RemboursementHero } from "@/components/remboursement-hero";
import {
  ArrowRight,
  CalendarCheck,
  FileDown,
  Send,
  Info,
} from "lucide-react";
import { MutuelleLogo } from "@/components/mutuelle-logo";

export const metadata: Metadata = {
  title: "Remboursement Médecines Douces : Le Guide Complet | Holia.me",
  description:
    "Découvrez comment votre mutuelle prend en charge vos séances de bien-être. Comparez les mutuelles et professions remboursées, suivez nos 3 étapes pour être remboursé.",
  openGraph: {
    title: "Remboursement Médecines Douces : Le Guide Complet | Holia.me",
    description:
      "Découvrez comment votre mutuelle prend en charge vos séances de bien-être.",
    type: "website",
  },
};

function formatProfessionName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function formatMutuelleName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

interface PageProps {
  searchParams: Promise<{ info?: string }>;
}

export default async function RemboursementHubPage({ searchParams }: PageProps) {
  const { info } = await searchParams;

  // Récupération dynamique via profession_mutuelles (table ReimbursementPolicy)
  // : professions et mutuelles liées par au moins une politique de remboursement
  const [allProfessionsWithMutuelles, allMutuellesWithProfessions, professionsForGrid, mutuellesForGrid] =
    await Promise.all([
      prisma.professions.findMany({
        where: { profession_mutuelles: { some: {} } },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      prisma.mutuelles.findMany({
        where: { profession_mutuelles: { some: {} } },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      prisma.professions.findMany({
        where: { profession_mutuelles: { some: {} } },
        include: { _count: { select: { profession_mutuelles: true } } },
        orderBy: { name: "asc" },
        take: 12,
      }),
      prisma.mutuelles.findMany({
        where: { profession_mutuelles: { some: {} } },
        orderBy: { name: "asc" },
        take: 15,
      }),
    ]);

  const professionOptions = allProfessionsWithMutuelles.map((p) => ({
    value: p.slug,
    label: formatProfessionName(p.name),
  }));

  const mutuelleOptions = allMutuellesWithProfessions.map((m) => ({
    value: m.slug,
    label: formatMutuelleName(m.name),
  }));

  const showInfoMessage = info === "combination_not_found";

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f7f7f7" }}>
      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="mb-8 text-sm">
            <ol className="flex items-center gap-2 text-slate-600">
              <li>
                <Link href="/" className="hover:text-[#9bb49b] transition-colors">
                  Accueil
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href="/recherche"
                  className="hover:text-[#9bb49b] transition-colors"
                >
                  Recherche
                </Link>
              </li>
              <li>/</li>
              <li className="text-slate-900 font-medium">
                Remboursement mutuelle
              </li>
            </ol>
          </nav>
          <div className="rounded-3xl bg-white shadow-sm border border-gray-100 p-8 lg:p-12">
            {showInfoMessage && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[#9bb49b]/10 border border-[#9bb49b]/20 p-4">
                <Info className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">
                  La combinaison mutuelle/métier demandée n&apos;existe pas dans
                  notre base. Sélectionnez une mutuelle et un métier ci-dessous
                  pour vérifier les prises en charge disponibles.
                </p>
              </div>
            )}
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold font-heading text-slate-900 leading-tight mb-4">
              Remboursement Médecines Douces : Le Guide Complet
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 mb-10 max-w-2xl">
              Découvrez comment votre mutuelle prend en charge vos séances de
              bien-être.
            </p>
            <RemboursementHero
              professions={professionOptions}
              mutuelles={mutuelleOptions}
            />
          </div>
        </div>
      </section>

      {/* Guide Pédagogique - 3 étapes (SEO) */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white shadow-sm border border-gray-100 p-8 lg:p-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-10">
              3 étapes pour être remboursé
            </h2>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center mb-4">
                  <CalendarCheck className="h-8 w-8 text-[#9bb49b]" />
                </div>
                <span className="text-sm font-semibold text-[#9bb49b] mb-2">
                  Étape 1
                </span>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Réservez sur Holia
                </h3>
                <p className="text-slate-600 text-sm">
                  Choisissez votre praticien et prenez rendez-vous en quelques
                  clics sur Holia.me.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center mb-4">
                  <FileDown className="h-8 w-8 text-[#9bb49b]" />
                </div>
                <span className="text-sm font-semibold text-[#9bb49b] mb-2">
                  Étape 2
                </span>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Téléchargez votre facture après la séance
                </h3>
                <p className="text-slate-600 text-sm">
                  Récupérez votre facture depuis votre espace patient Holia après
                  votre rendez-vous.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center mb-4">
                  <Send className="h-8 w-8 text-[#9bb49b]" />
                </div>
                <span className="text-sm font-semibold text-[#9bb49b] mb-2">
                  Étape 3
                </span>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Envoyez-la via votre application mutuelle
                </h3>
                <p className="text-slate-600 text-sm">
                  Transmettez la facture à votre mutuelle (en ligne ou par
                  courrier) pour obtenir votre remboursement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Par Pratique */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
            Par Pratique
          </h2>
          <p className="text-slate-600 mb-10">
            Explorez les professions de médecine douce et bien-être remboursées
            par les mutuelles partenaires.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {professionsForGrid.map((p) => {
              const count = p._count.profession_mutuelles;
              return (
                <Link
                  key={p.id}
                  href={`/remboursement/${p.slug}`}
                  className="group flex flex-col rounded-3xl bg-white border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-[#9bb49b]/30 transition-all duration-200"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-[#9bb49b] transition-colors line-clamp-2">
                      {formatProfessionName(p.name)}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {count} mutuelle{count > 1 ? "s" : ""} partenaire
                      {count > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#9bb49b] group-hover:gap-2 transition-all">
                    Voir les détails
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Par Mutuelle */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
            Par Mutuelle
          </h2>
          <p className="text-slate-600 mb-10">
            Consultez les mutuelles partenaires et les professions qu&apos;elles
            remboursent.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mutuellesForGrid.map((m) => (
              <Link
                key={m.id}
                href={`/remboursement/${m.slug}`}
                className="group flex flex-col items-center justify-center rounded-3xl bg-white border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-[#9bb49b]/30 transition-all duration-200 min-h-[160px]"
              >
                <div className="mb-3 flex items-center justify-center">
                  <MutuelleLogo name={m.name} size={80} />
                </div>
                <span className="text-sm font-semibold text-slate-900 text-center line-clamp-2 group-hover:text-[#9bb49b] transition-colors">
                  {formatMutuelleName(m.name)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
