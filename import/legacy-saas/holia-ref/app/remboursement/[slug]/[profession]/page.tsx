import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui";
import { CheckCircle, ArrowLeft, ArrowRight, ChevronDown, HelpCircle, Lightbulb } from "lucide-react";
import { MutuelleLogo } from "@/components/mutuelle-logo";
import { RdvCityWidget } from "@/components/rdv-city-widget";

interface PageProps {
  params: Promise<{ slug: string; profession: string }>;
}

async function getSniperData(mutuelleSlug: string, professionSlug: string) {
  const pm = await prisma.profession_mutuelles.findFirst({
    where: {
      mutuelle: { slug: mutuelleSlug.toLowerCase() },
      profession: { slug: professionSlug.toLowerCase() },
    },
    include: {
      mutuelle: true,
      profession: {
        include: {
          _count: { select: { practitioners: true } },
        },
      },
    },
  });
  return pm;
}

function formatMutuelleName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatProfessionName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: mutuelleSlug, profession: professionSlug } = await params;
  const data = await getSniperData(mutuelleSlug, professionSlug);
  if (!data) {
    return { title: "Remboursement mutuelle | Holia.me" };
  }
  const mutuelleName = formatMutuelleName(data.mutuelle.name);
  const professionName = formatProfessionName(data.profession.name);
  const title = `Remboursement ${professionName} ${mutuelleName} : forfait et prise RDV | Holia.me`;
  const description = `Découvrez les conditions de remboursement des séances de ${professionName.toLowerCase()} par ${mutuelleName}. Prenez rendez-vous avec un expert ${professionName.toLowerCase()} près de chez vous sur Holia.me.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function RemboursementSniperPage({ params }: PageProps) {
  const { slug: mutuelleSlug, profession: professionSlug } = await params;
  const data = await getSniperData(mutuelleSlug, professionSlug);

  if (!data) {
    redirect("/remboursement?info=combination_not_found");
  }

  const mutuelleName = formatMutuelleName(data.mutuelle.name);
  const professionName = formatProfessionName(data.profession.name);
  const practitionerCount = data.profession._count.practitioners;

  const faqItems = [
    {
      question: `Quel est le montant du forfait médecine douce chez ${mutuelleName} ?`,
      answer: `Le montant du forfait médecine douce varie selon votre contrat ${mutuelleName}. Il peut s'agir d'un forfait annuel (ex. 150€ à 400€) ou d'un remboursement par acte. Consultez votre notice d'information ou contactez directement ${mutuelleName} pour connaître le détail de votre prise en charge pour les séances de ${professionName.toLowerCase()}.`,
    },
    {
      question: `Quels justificatifs envoyer à ${mutuelleName} après ma séance ?`,
      answer: `Généralement, ${mutuelleName} demande une facture détaillée du praticien (nom, date, prestation, montant) et éventuellement une attestation de séance. Après votre rendez-vous sur Holia, vous pouvez télécharger votre facture depuis votre espace patient et l'envoyer à votre mutuelle pour le remboursement.`,
    },
    {
      question: `Faut-il une prescription médicale pour être remboursé par ${mutuelleName} ?`,
      answer: `Selon les contrats, ${mutuelleName} peut exiger ou non une prescription médicale pour les actes de ${professionName.toLowerCase()}. Les forfaits médecines douces sont souvent accessibles sans prescription. Vérifiez les conditions précises de votre contrat auprès de votre conseiller ${mutuelleName}.`,
    },
    {
      question: `Holia fournit-il une facture conforme pour ${mutuelleName} ?`,
      answer: `Oui. Les praticiens Holia peuvent vous délivrer une facture conforme aux exigences des mutuelles, y compris ${mutuelleName}. Pensez à demander votre facture via votre espace patient Holia dès la fin de votre séance, puis envoyez-la à votre mutuelle pour obtenir votre remboursement.`,
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="relative overflow-hidden bg-gradient-to-b from-[#9bb49b]/10 via-[#9bb49b]/5 to-white pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="mb-12 lg:mb-16 text-sm">
            <ol className="flex items-center gap-2 text-anthracite/70 flex-wrap">
              <li><Link href="/" className="hover:text-sauge transition-colors">Accueil</Link></li>
              <li>/</li>
              <li><Link href="/recherche" className="hover:text-sauge transition-colors">Recherche</Link></li>
              <li>/</li>
              <li><Link href={`/remboursement/${mutuelleSlug}`} className="hover:text-sauge transition-colors">{mutuelleName}</Link></li>
              <li>/</li>
              <li className="text-anthracite font-medium">{professionName}</li>
            </ol>
          </nav>
          <div className="mb-8 lg:mb-10">
            <MutuelleLogo name={data.mutuelle.name} size={96} grayscaleOnHover={false} />
          </div>
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold font-heading text-slate-900 leading-tight mb-6 lg:mb-8">
            Remboursement {professionName} {mutuelleName}
          </h1>
          <p className="text-xl lg:text-2xl text-slate-600 leading-relaxed max-w-3xl">
            {mutuelleName} propose une prise en charge pour les séances de {professionName.toLowerCase()}. Découvrez les conditions de forfait et prenez rendez-vous avec un expert sur Holia.me.
          </p>
          <Link href={`/remboursement/${mutuelleSlug}`} className="inline-flex items-center gap-2 mt-8 text-sauge font-medium hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Voir toutes les professions remboursées par {mutuelleName}
          </Link>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-[#fafaf9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-8">Conditions de remboursement {professionName} {mutuelleName}</h2>
          <Card className="rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="p-8 lg:p-12">
              <ul className="space-y-6 text-anthracite/80">
                <li className="flex gap-3"><CheckCircle className="h-6 w-6 text-sauge flex-shrink-0 mt-0.5" /><span>{mutuelleName} rembourse les séances de {professionName.toLowerCase()} dans le cadre de son forfait médecines douces / bien-être.</span></li>
                <li className="flex gap-3"><CheckCircle className="h-6 w-6 text-sauge flex-shrink-0 mt-0.5" /><span>Les montants et plafonds varient selon votre contrat. Consultez votre notice ou contactez {mutuelleName} pour connaître le détail de votre prise en charge.</span></li>
                <li className="flex gap-3"><CheckCircle className="h-6 w-6 text-sauge flex-shrink-0 mt-0.5" /><span>Demandez une facture ou attestation à votre praticien pour faciliter le remboursement auprès de votre mutuelle.</span></li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="rounded-3xl border-2 border-sauge/30 bg-sauge/5 overflow-hidden">
            <CardContent className="p-8 lg:p-12">
              <RdvCityWidget professionId={data.profession.id} professionName={professionName} />
              {practitionerCount > 0 && (
                <p className="mt-6 text-sm text-slate-600">
                  {practitionerCount} praticien{practitionerCount > 1 ? "s" : ""} {professionName.toLowerCase()}{practitionerCount > 1 ? "s" : ""} disponible{practitionerCount > 1 ? "s" : ""} sur Holia.me.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Conseil Holia */}
      <section className="py-20 lg:py-28 bg-[#fafaf9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6 lg:p-8 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-[#9bb49b]/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="h-5 w-5 text-[#9bb49b]" />
            </div>
            <div>
              <h3 className="font-semibold text-anthracite mb-2">Conseil Holia</h3>
              <p className="text-slate-600 text-sm lg:text-base">
                Pensez à demander votre facture à votre praticien via votre espace patient Holia dès la fin de votre séance. Vous pourrez la télécharger et l&apos;envoyer directement à {mutuelleName} pour faciliter votre remboursement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Dynamique */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-8 flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-[#9bb49b]" />
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="group rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden"
              >
                <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <h3 className="text-base lg:text-lg font-semibold text-anthracite pr-4">
                    {item.question}
                  </h3>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0">
                    <ChevronDown className="h-5 w-5" />
                  </span>
                </summary>
                <div className="px-6 pb-4 pt-0">
                  <p className="text-slate-600 leading-relaxed">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-[#fafaf9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-anthracite mb-6">Pour aller plus loin</h2>
          <div className="flex flex-wrap gap-4">
            <Link href={`/remboursement/${mutuelleSlug}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-200 text-anthracite font-medium hover:border-sauge hover:bg-sauge/5 transition-all">
              <ArrowLeft className="h-4 w-4" />
              Toutes les professions remboursées par {mutuelleName}
            </Link>
            <Link href={`/remboursement/${professionSlug}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-200 text-anthracite font-medium hover:border-sauge hover:bg-sauge/5 transition-all">
              Toutes les mutuelles pour {professionName.toLowerCase()}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/recherche" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sauge hover:bg-sauge-dark text-white font-medium transition-colors">
              Rechercher un praticien
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
