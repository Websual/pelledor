import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MapPin, Star, Shield, Brain, Moon, Heart, Apple, Activity, Baby, Users, User, Sparkles } from "lucide-react";
import { SubjectHeroSearch } from "./hero-search";
import Image from "next/image";

// Map des icônes par nom (identique à BesoinCards)
const iconMap = {
  Brain,
  Moon,
  Heart,
  Stomach: Apple, // Mapping vers Apple pour les problèmes digestifs
  Activity,
  Baby,
  Users,
  User,
  Shield,
  Sparkles
};

// Fonction pour obtenir l'icône Lucide-react
const getIcon = (iconName: string) => {
  const IconComponent = iconMap[iconName as keyof typeof iconMap];
  return IconComponent || Brain; // Fallback vers Brain si l'icône n'existe pas
};

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Trouver les informations du sujet
async function getSubjectInfo(slug: string) {
  try {
    const subject = await prisma.subjects.findUnique({
      where: { slug }
    });

    return subject;
  } catch (error) {
    console.error('Erreur lors de la récupération du sujet:', error);
    return null;
  }
}

// Récupérer les villes principales avec des praticiens pour ce sujet
async function getCitiesWithPractitioners(subjectId: string) {
  try {
    // Récupérer les professionIds liés au sujet
    const subjectProfessions = await prisma.subject_professions.findMany({
      where: {
        subject_id: subjectId
      },
      select: {
        profession_id: true
      }
    });

    const professionIds = subjectProfessions.map(sp => sp.profession_id);

    if (professionIds.length === 0) {
      return [];
    }

    // Compter les praticiens par ville
    const cityCounts = await prisma.practitioners.groupBy({
      by: ['location_city'],
      where: {
        profession_id: {
          in: professionIds
        },
        is_active: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 12 // Top 12 villes pour la grille 3x4
    });

    return cityCounts.map(city => ({
      name: city.location_city,
      count: city._count.id
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des villes:', error);
    return [];
  }
}

// Récupérer les 6 praticiens les mieux notés pour ce sujet
async function getTopRatedPractitioners(subjectId: string) {
  try {
    // Récupérer les professionIds liés au sujet
    const subjectProfessions = await prisma.subject_professions.findMany({
      where: {
        subject_id: subjectId
      },
      select: {
        profession_id: true
      }
    });

    const professionIds = subjectProfessions.map(sp => sp.profession_id);

    if (professionIds.length === 0) {
      return [];
    }

    // Récupérer les praticiens les mieux notés
    const practitioners = await prisma.practitioners.findMany({
      where: {
        profession_id: {
          in: professionIds
        },
        is_active: true
      },
      select: {
        id: true,
        title: true,
        slug: true,
        photo_url: true,
        location_city: true,
        rating_avg: true,
        is_verified: true,
        _count: {
          select: {
            reviews: true
          }
        }
      },
      orderBy: [
        { rating_avg: 'desc' },
        { is_verified: 'desc' }
      ],
      take: 6
    });

    return practitioners;
  } catch (error) {
    console.error('Erreur lors de la récupération des praticiens:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const subject = await getSubjectInfo(slug);

  if (!subject) {
    return {
      title: "Page non trouvée",
    };
  }

  const title = `${subject.emoji} ${subject.name} - Praticiens spécialisés en France`;
  const description = subject.metaDescription || `Trouvez les meilleurs praticiens spécialisés en ${subject.name.toLowerCase()} partout en France. Approches naturelles et holistiques pour votre bien-être.`;

  return {
    title,
    description,
    keywords: [
      subject.name.toLowerCase(),
      'praticien',
      'bien-être',
      'naturel',
      'thérapies',
      'santé',
      'france'
    ].concat(subject.keywords || []),
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function SubjectPage({ params }: PageProps) {
  const { slug } = await params;
  const subject = await getSubjectInfo(slug);

  if (!subject) {
    notFound();
  }

  const cities = await getCitiesWithPractitioners(subject.id);
  const topPractitioners = await getTopRatedPractitioners(subject.id);

  return (
    <div className="bg-[#f7f7f7] min-h-screen pt-24">
      {/* Hero Section */}
      <div className="bg-white border-b border-sable/30 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Icône et titre */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="w-20 h-20 bg-[#9bb49b]/10 rounded-full flex items-center justify-center">
                {(() => {
                  const IconComponent = getIcon(subject.icon);
                  return <IconComponent className="h-10 w-10 text-[#9bb49b]" strokeWidth={1.5} />;
                })()}
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-3">
                  {subject.name}
                </h1>
                <p className="text-lg text-anthracite/70">
                  Trouvez les meilleurs praticiens spécialisés partout en France
                </p>
              </div>
            </div>

            {/* Barre de recherche de ville */}
            <div className="max-w-2xl mx-auto">
              <SubjectHeroSearch subjectSlug={slug} subjectName={subject.name} />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl p-8 md:p-12 shadow-sm border border-sable/30 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-anthracite mb-6 text-center">
            Pourquoi choisir une approche naturelle pour {subject.name.toLowerCase()} ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Colonne gauche */}
            <div className="space-y-4">
              {subject.metaDescription && (
                <p className="text-lg text-slate-600 leading-relaxed">
                  {subject.metaDescription.replace(/\[City\]/g, 'en France')}
                </p>
              )}
              <p className="text-slate-600 leading-relaxed">
                Les praticiens spécialisés en {subject.name.toLowerCase()} utilisent des méthodes douces et respectueuses de votre organisme en France. 
                Que vous recherchiez un accompagnement ponctuel ou un suivi à long terme, nos professionnels certifiés vous proposent des solutions adaptées à vos besoins spécifiques.
              </p>
            </div>

            {/* Colonne droite */}
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Sur Holia.me, nous mettons en relation des patients avec des praticiens qualifiés et vérifiés, spécialisés dans les approches naturelles et holistiques en France. 
                Chaque praticien est sélectionné pour son expertise et son engagement envers votre bien-être.
              </p>
              
              {/* Bénéfices avec puces */}
              <div className="space-y-2">
                <p className="font-semibold text-anthracite mb-2">Les bénéfices de l'approche naturelle :</p>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-sauge mt-1.5">•</span>
                    <span>Méthodes douces et respectueuses de votre organisme</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sauge mt-1.5">•</span>
                    <span>Accompagnement personnalisé adapté à vos besoins</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sauge mt-1.5">•</span>
                    <span>Praticiens certifiés et vérifiés pour votre sécurité</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sauge mt-1.5">•</span>
                    <span>Approches holistiques pour un bien-être global</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sauge mt-1.5">•</span>
                    <span>Suivi à long terme pour des résultats durables</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Section experts les plus recommandés */}
        {topPractitioners.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-anthracite mb-8 text-center">
              Les experts les plus recommandés en France
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topPractitioners.map((practitioner) => (
                <Link
                  key={practitioner.id}
                  href={`/praticien/${practitioner.slug}`}
                  className="group bg-white rounded-2xl p-6 border border-sable/30 hover:border-sauge hover:bg-sauge/5 transition-all duration-200 hover:shadow-lg"
                >
                  {/* Photo et infos */}
                  <div className="flex items-start gap-4 mb-4">
                    {/* Photo */}
                    <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                      {practitioner.photo_url ? (
                        <Image
                          src={practitioner.photo_url}
                          alt={practitioner.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-[#9bb49b]/10 flex items-center justify-center">
                          <div className="text-[#9bb49b] font-bold text-lg">
                            {practitioner.title
                              .split(' ')
                              .map((word: string) => word.charAt(0).toUpperCase())
                              .slice(0, 2)
                              .join('')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Nom et localisation */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-anthracite group-hover:text-sauge transition-colors truncate">
                          {practitioner.title}
                        </h3>
                        {practitioner.is_verified && (
                          <Shield className="h-4 w-4 text-sauge flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-anthracite/60">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{practitioner.location_city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Note et avis */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-anthracite">
                        {practitioner.rating_avg?.toFixed(1).replace(".", ",") || "0,0"}
                      </span>
                    </div>
                    <span className="text-sm text-anthracite/60">
                      ({practitioner._count.reviews} avis)
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section villes populaires - Grille 3x4 */}
        {cities.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-anthracite mb-8 text-center">
              Villes les plus recherchées
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cities.slice(0, 12).map((city) => (
                <Link
                  key={city.name}
                  href={`/sujet/${slug}/${city.name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '-')}`}
                  className="group relative bg-white rounded-3xl p-6 border border-sable/30 hover:border-sauge hover:bg-sauge/5 transition-all duration-200 hover:shadow-lg"
                >
                  {/* Icône de localisation */}
                  <div className="flex items-center justify-center w-12 h-12 bg-[#9bb49b]/10 rounded-full mb-4 group-hover:bg-[#9bb49b]/20 transition-colors">
                    <MapPin className="h-6 w-6 text-[#9bb49b]" />
                  </div>
                  
                  {/* Nom de la ville */}
                  <div className="font-bold text-lg text-anthracite mb-2 group-hover:text-sauge transition-colors">
                    {city.name}
                  </div>
                  
                  {/* Nombre de praticiens */}
                  <div className="text-sm text-anthracite/60">
                    {city.count} praticien{city.count > 1 ? 's' : ''}
                  </div>
                  
                  {/* Effet hover - flèche */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-sauge" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
