import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui";
import { Building2, CheckCircle, ArrowRight, Search, CalendarCheck, FileDown, Send, MapPin } from "lucide-react";
import { MutuelleLogo } from "@/components/mutuelle-logo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getMutuelleWithProfessions(slug: string) {
  return prisma.mutuelles.findUnique({
    where: { slug: slug.toLowerCase() },
    include: {
      profession_mutuelles: {
        include: {
          profession: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
}

async function getProfessionWithMutuelles(slug: string) {
  return prisma.professions.findUnique({
    where: { slug: slug.toLowerCase() },
    include: {
      profession_mutuelles: {
        include: { mutuelle: { select: { name: true, slug: true } } },
      },
      _count: { select: { practitioners: true } },
    },
  });
}

function formatMutuelleName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatProfessionName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

const POPULAR_CITIES = ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Nice", "Nantes", "Strasbourg"];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const mutuelle = await getMutuelleWithProfessions(slug);
  if (mutuelle) {
    const name = formatMutuelleName(mutuelle.name);
    const count = mutuelle.profession_mutuelles.length;
    const title = `Que rembourse ${name} en médecine douce ? ${count} professions | Holia.me`;
    const description = `Découvrez les professions de médecine douce et bien-être remboursées par ${name}. ${count} types de praticiens peuvent être pris en charge. Trouvez un expert sur Holia.me.`;
    return { title, description, openGraph: { title, description, type: "website" } };
  }
  const profession = await getProfessionWithMutuelles(slug);
  if (profession) {
    const name = formatProfessionName(profession.name);
    const count = profession.profession_mutuelles.length;
    const title = `Remboursement mutuelle ${name} : ${count} mutuelles remboursent | Holia.me`;
    const description = `Découvrez les conditions de remboursement des séances de ${name} par les mutuelles. ${count} mutuelles proposent une prise en charge. Trouvez un ${profession.name.toLowerCase()} près de chez vous sur Holia.me.`;
    return { title, description, openGraph: { title, description, type: "website" } };
  }
  return { title: "Remboursement | Holia.me" };
}

export default async function RemboursementSlugPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Try mutuelle first
  const mutuelle = await getMutuelleWithProfessions(slug);
  if (mutuelle) {
    const professions = mutuelle.profession_mutuelles.map((pm) => pm.profession);
    const professionsCount = professions.length;
    const mutuelleName = formatMutuelleName(mutuelle.name);
    const hasProfessions = professionsCount > 0;

    return (
      <main className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-b from-[#9bb49b]/10 via-[#9bb49b]/5 to-white pt-32 pb-24 lg:pt-40 lg:pb-32">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="mb-12 lg:mb-16 text-sm">
              <ol className="flex items-center gap-2 text-anthracite/70">
                <li><Link href="/" className="hover:text-sauge transition-colors">Accueil</Link></li>
                <li>/</li>
                <li><Link href="/recherche" className="hover:text-sauge transition-colors">Recherche</Link></li>
                <li>/</li>
                <li className="text-anthracite font-medium">{mutuelleName}</li>
              </ol>
            </nav>
            <div className="mb-8 lg:mb-10">
              <MutuelleLogo name={mutuelle.name} size={96} grayscaleOnHover={false} />
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold font-heading text-slate-900 leading-tight mb-6 lg:mb-8">
              Que rembourse {mutuelleName} en médecine douce ?
            </h1>
            <p className="text-xl lg:text-2xl text-slate-600 leading-relaxed max-w-3xl">
              {hasProfessions ? (
                <>{mutuelleName} propose une prise en charge pour les séances de {professionsCount} type{professionsCount > 1 ? "s" : ""} de praticiens en bien-être et médecine douce. Découvrez les professions remboursées et les conditions de forfait.</>
              ) : (
                <>Renseignez-vous auprès de {mutuelleName} pour connaître les éventuelles prises en charge des médecines douces et du bien-être. Les forfaits varient selon les contrats.</>
              )}
            </p>
          </div>
        </section>
        {hasProfessions && (
          <section className="py-20 lg:py-28 bg-[#fafaf9]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-4">Professions remboursées par {mutuelleName}</h2>
              <p className="text-slate-600 mb-12 lg:mb-16">Cliquez sur une profession pour connaître les conditions de forfait et prendre rendez-vous avec un expert.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                {professions.map((p) => (
                  <Link key={p.id} href={`/remboursement/${slug}/${p.slug}`} className="group flex flex-col items-center justify-center p-6 lg:p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-[#9bb49b]/30 transition-all duration-200">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center mb-4 group-hover:bg-[#9bb49b]/20 transition-colors">
                      <CheckCircle className="h-7 w-7 lg:h-8 lg:w-8 text-[#9bb49b]" />
                    </div>
                    <span className="text-sm lg:text-base font-semibold text-anthracite text-center line-clamp-2 group-hover:text-sauge transition-colors">{formatProfessionName(p.name)}</span>
                    <span className="mt-2 text-xs text-slate-500">Forfait moyen : 30€ à 50€ / séance</span>
                    <span className="mt-2 text-xs text-slate-500 flex items-center gap-1">Voir le forfait <ArrowRight className="h-3 w-3" /></span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="rounded-3xl border border-sauge/30 bg-sauge/5 overflow-hidden">
              <CardContent className="p-8 lg:p-12">
                <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-4">Trouvez votre praticien partenaire</h2>
                <p className="text-lg text-anthracite/70 mb-6">Choisissez une ville pour trouver un praticien près de chez vous et réserver en ligne avec des professionnels vérifiés.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {POPULAR_CITIES.map((city) => (
                    <Link
                      key={city}
                      href={`/recherche?city=${encodeURIComponent(city)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-anthracite hover:border-sauge hover:bg-sauge/5 hover:text-sauge transition-all"
                    >
                      <MapPin className="h-4 w-4" />
                      {city}
                    </Link>
                  ))}
                </div>
                <Link href="/recherche" className="inline-flex items-center gap-2 px-8 py-4 bg-sauge hover:bg-sauge-dark text-white font-semibold rounded-xl transition-colors">
                  Rechercher un praticien <ArrowRight className="h-5 w-5" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    );
  }

  // 2. Try profession
  const profession = await getProfessionWithMutuelles(slug);
  if (!profession) notFound();

  const mutuelles = profession.profession_mutuelles.map((pm) => pm.mutuelle);
  const mutuellesCount = mutuelles.length;
  const professionName = formatProfessionName(profession.name);
  const hasReimbursement = mutuellesCount > 0;

  return (
    <main className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-b from-[#9bb49b]/10 via-[#9bb49b]/5 to-white pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="mb-12 lg:mb-16 text-sm">
            <ol className="flex items-center gap-2 text-anthracite/70">
              <li><Link href="/" className="hover:text-sauge transition-colors">Accueil</Link></li>
              <li>/</li>
              <li><Link href="/recherche" className="hover:text-sauge transition-colors">Recherche</Link></li>
              <li>/</li>
              <li className="text-anthracite font-medium">Remboursement {professionName}</li>
            </ol>
          </nav>
          <div className="mb-8 lg:mb-10">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-[#9bb49b]/10 rounded-full flex items-center justify-center">
              <Building2 className="h-10 w-10 lg:h-12 lg:w-12 text-[#9bb49b]" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold font-heading text-slate-900 leading-tight mb-6 lg:mb-8">
            Remboursement mutuelle : {professionName}
          </h1>
          <p className="text-xl lg:text-2xl text-slate-600 leading-relaxed max-w-3xl">
            {hasReimbursement ? (
              <>Les séances de {professionName.toLowerCase()} peuvent être remboursées par votre mutuelle complémentaire. Découvrez les mutuelles qui proposent une prise en charge et les conditions pour optimiser votre remboursement.</>
            ) : (
              <>Les séances de {professionName.toLowerCase()} ne sont généralement pas remboursées par la Sécurité Sociale. Renseignez-vous auprès de votre mutuelle pour connaître les éventuelles prises en charge des médecines douces et du bien-être.</>
            )}
          </p>
        </div>
      </section>
      {/* Guide 3 étapes */}
      <section className="py-20 lg:py-28 bg-[#9bb49b]/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-12">3 étapes pour être remboursé</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center mb-4">
                <CalendarCheck className="h-7 w-7 text-[#9bb49b]" />
              </div>
              <span className="text-sm font-semibold text-[#9bb49b] mb-2">Étape 1</span>
              <h3 className="font-semibold text-anthracite mb-2">Réservez sur Holia</h3>
              <p className="text-slate-600 text-sm">Choisissez votre praticien et prenez rendez-vous en quelques clics sur Holia.me.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center mb-4">
                <FileDown className="h-7 w-7 text-[#9bb49b]" />
              </div>
              <span className="text-sm font-semibold text-[#9bb49b] mb-2">Étape 2</span>
              <h3 className="font-semibold text-anthracite mb-2">Téléchargez votre facture</h3>
              <p className="text-slate-600 text-sm">Après la séance, récupérez votre facture depuis votre espace patient Holia.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#9bb49b]/10 flex items-center justify-center mb-4">
                <Send className="h-7 w-7 text-[#9bb49b]" />
              </div>
              <span className="text-sm font-semibold text-[#9bb49b] mb-2">Étape 3</span>
              <h3 className="font-semibold text-anthracite mb-2">Envoyez-la à votre mutuelle</h3>
              <p className="text-slate-600 text-sm">Transmettez la facture à votre mutuelle (en ligne ou par courrier) pour obtenir votre remboursement.</p>
            </div>
          </div>
        </div>
      </section>

      {hasReimbursement && (
        <section className="py-20 lg:py-28 bg-[#fafaf9]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-4">{mutuellesCount} mutuelle{mutuellesCount > 1 ? "s" : ""} remboursent les séances de {professionName.toLowerCase()}</h2>
            <p className="text-slate-600 mb-12 lg:mb-16">Liste non exhaustive – conditions variables selon les contrats. Cliquez sur une mutuelle pour en savoir plus.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {mutuelles.map((m) => (
                <Link key={m.slug} href={`/remboursement/${m.slug}/${slug}`} className="group flex flex-col items-center justify-center p-6 lg:p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-[#9bb49b]/30 transition-all duration-200 min-h-[160px]">
                  <div className="mb-4 flex items-center justify-center">
                    <MutuelleLogo name={m.name} size={80} />
                  </div>
                  <span className="text-sm lg:text-base font-semibold text-anthracite text-center line-clamp-2 group-hover:text-sauge transition-colors">{m.name}</span>
                  <span className="mt-2 text-xs text-slate-500">Voir les conditions</span>
                </Link>
              ))}
            </div>
            {/* Maillage vers dossiers spécifiques */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-anthracite mb-4">Découvrir le remboursement {professionName.toLowerCase()} par mutuelle</h3>
              <div className="flex flex-wrap gap-2">
                {mutuelles.map((m) => (
                  <Link key={m.slug} href={`/remboursement/${m.slug}/${slug}`} className="inline-flex items-center px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-anthracite hover:border-[#9bb49b]/50 hover:bg-[#9bb49b]/5 transition-all">
                    Découvrir le remboursement {professionName} chez {formatMutuelleName(m.name)}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comparatif forfaits */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-8">Comparatif des types de forfaits</h2>
          <div className="rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#9bb49b]/5">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-anthracite">Critère</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-anthracite">Forfait annuel</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-anthracite">Forfait à la séance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">Montant</td>
                  <td className="px-6 py-4 text-sm text-slate-600">Plafond global par an (ex. 150€ à 400€)</td>
                  <td className="px-6 py-4 text-sm text-slate-600">X euros par acte (ex. 30€/séance)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">Idéal pour</td>
                  <td className="px-6 py-4 text-sm text-slate-600">Suivi régulier, plusieurs séances dans l&apos;année</td>
                  <td className="px-6 py-4 text-sm text-slate-600">Consultations ponctuelles</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">Justificatif</td>
                  <td className="px-6 py-4 text-sm text-slate-600">Facture à chaque séance</td>
                  <td className="px-6 py-4 text-sm text-slate-600">Facture à chaque séance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Texte sémantique ~200 mots */}
      <section className="py-20 lg:py-28 bg-[#fafaf9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-8">Remboursement {professionName} : ce qu&apos;il faut savoir</h2>
          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
            <p>
              La Sécurité Sociale ne rembourse pas les séances de {professionName.toLowerCase()} dans la grande majorité des cas. En France, seules certaines professions de santé conventionnées (kinésithérapeute, médecin, sage-femme, etc.) bénéficient d&apos;une prise en charge par l&apos;Assurance Maladie. La {professionName.toLowerCase()} fait partie des médecines douces et approches complémentaires, reconnues pour leurs bienfaits mais non intégrées au parcours de soins remboursé par la Sécu.
            </p>
            <p>
              En revanche, les mutuelles complémentaires santé proposent de plus en plus des forfaits dédiés aux médecines douces et au bien-être. Face à une demande croissante des assurés pour des pratiques naturelles (ostéopathie, naturopathie, sophrologie, acupuncture…), les assureurs ont enrichi leurs offres. Ces forfaits permettent de se faire rembourser tout ou partie des séances de {professionName.toLowerCase()} selon le niveau de garantie souscrit.
            </p>
            <p>
              Pour bénéficier du remboursement, il suffit généralement de transmettre une facture détaillée à sa mutuelle après chaque séance. Les praticiens Holia peuvent vous délivrer une facture conforme à ces exigences. Pensez à vérifier les conditions précises de votre contrat (plafond annuel, montant par acte, franchises éventuelles) auprès de votre conseiller ou sur votre espace en ligne.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="p-8 lg:p-12">
              <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-8">Conditions de remboursement</h2>
              <ul className="space-y-6 text-anthracite/80">
                <li className="flex gap-3"><CheckCircle className="h-6 w-6 text-sauge flex-shrink-0 mt-0.5" /><span>La Sécurité Sociale ne rembourse pas les séances de {professionName.toLowerCase()} sauf prescription médicale dans certains cas (ex. kinésithérapie conventionnée).</span></li>
                <li className="flex gap-3"><CheckCircle className="h-6 w-6 text-sauge flex-shrink-0 mt-0.5" /><span>Les mutuelles proposent des forfaits annuels ou par acte selon votre contrat (nombre de séances, plafond en euros).</span></li>
                <li className="flex gap-3"><CheckCircle className="h-6 w-6 text-sauge flex-shrink-0 mt-0.5" /><span>Consultez votre contrat ou contactez votre mutuelle pour connaître le détail de votre prise en charge.</span></li>
                <li className="flex gap-3"><CheckCircle className="h-6 w-6 text-sauge flex-shrink-0 mt-0.5" /><span>Certains praticiens peuvent vous fournir une facture ou une attestation pour faciliter le remboursement auprès de votre mutuelle.</span></li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="py-20 lg:py-28 bg-[#fafaf9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="rounded-3xl border border-sauge/30 bg-sauge/5 overflow-hidden">
            <CardContent className="p-8 lg:p-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-anthracite mb-4">Trouvez un {professionName.toLowerCase()} près de chez vous</h2>
                  <p className="text-lg text-anthracite/70">
                    {profession._count.practitioners > 0 ? `${profession._count.practitioners} praticien${profession._count.practitioners > 1 ? "s" : ""} disponible${profession._count.practitioners > 1 ? "s" : ""} sur Holia.me` : "Réservez facilement en ligne avec des praticiens vérifiés."}
                  </p>
                </div>
                <Link href={`/recherche?professionId=${profession.id}`} className="inline-flex items-center gap-2 px-8 py-4 bg-sauge hover:bg-sauge-dark text-white font-semibold rounded-xl transition-colors shrink-0">
                  <Search className="h-5 w-5" /> Rechercher un praticien
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
