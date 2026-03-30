import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { PractitionersList } from "@/components/practitioners-list";
import { MapPin, User, Calendar, ArrowLeft } from "lucide-react";

// Temporairement gardé pour generateStaticParams mais remplacé par données vides


// Données vides pour éviter les imports JSON massifs
const emptyProfessions: string[] = [];
const emptyCities: string[] = [];


interface PageProps {
  params: Promise<{
    profession: string;
    city: string;
    locale: string;
  }>;
}

// Vérifier si la combinaison profession/city est valide
function isValidCombination(profession: string, city: string): boolean {
  const normalizedProfession = profession.toLowerCase();
  const normalizedCity = city.toLowerCase();

  const validProfessions = emptyProfessions.map(p => p.toLowerCase());
  const validCities = emptyCities.map(c => c.toLowerCase());

  return validProfessions.includes(normalizedProfession) && validCities.includes(normalizedCity);
}

// Formatter le nom de la profession pour l'affichage
function formatProfession(profession: string): string {
  return emptyProfessions.find(p =>
    p.toLowerCase() === profession.toLowerCase()
  ) || profession;
}

// Formatter le nom de la ville pour l'affichage
function formatCity(city: string): string {
  return emptyCities.find(c =>
    c.toLowerCase() === city.toLowerCase()
  ) || city;
}

// Templates variés pour le contenu descriptif
const DESCRIPTION_TEMPLATES = [
  {
    intro: "À {city}, la recherche d'un {profession} qualifié peut s'avérer complexe. Holia.me vous facilite la tâche en vous proposant une sélection de professionnels certifiés, vérifiés et disponibles pour des consultations personnalisées.",
    benefits: "Nos praticiens maîtrisent les dernières techniques et approches thérapeutiques, garantissant des soins de qualité adaptés à vos besoins spécifiques."
  },
  {
    intro: "Découvrez les meilleurs {profession} de {city} sur Holia.me. Notre plateforme vous connecte avec des thérapeutes expérimentés, tous vérifiés et disponibles pour des rendez-vous personnalisés.",
    benefits: "Chaque professionnel sélectionné sur notre plateforme s'engage à fournir des soins de qualité, dans un cadre sécurisant et bienveillant."
  },
  {
    intro: "Vous cherchez un {profession} de confiance à {city} ? Holia.me regroupe les praticiens les plus compétents de la région, tous validés par nos soins.",
    benefits: "Bénéficiez d'un accompagnement professionnel de qualité, avec des tarifs transparents et des avis clients vérifiés pour vous guider dans votre choix."
  },
  {
    intro: "Trouvez rapidement le {profession} idéal à {city} grâce à Holia.me. Notre sélection rigoureuse vous assure de rencontrer des professionnels qualifiés et expérimentés.",
    benefits: "Profitez d'une prise de rendez-vous simplifiée, de paiements sécurisés et d'un suivi personnalisé pour votre bien-être."
  },
  {
    intro: "À {city}, Holia.me vous aide à trouver le {profession} qui correspond à vos attentes. Découvrez notre réseau de thérapeutes certifiés, disponibles et engagés.",
    benefits: "Tous nos praticiens respectent les normes de qualité les plus strictes, assurant des consultations dans les meilleures conditions."
  }
];

// Fonction pour sélectionner un template basé sur le hash de la ville
function getTemplateForCity(city: string): typeof DESCRIPTION_TEMPLATES[0] {
  const hash = city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DESCRIPTION_TEMPLATES[hash % DESCRIPTION_TEMPLATES.length];
}

export async function generateStaticParams() {
  const params: Array<{
    profession: string;
    city: string;
    locale: string;
  }> = [];

  // Générer toutes les combinaisons - données vides pour éviter les imports massifs
  for (const profession of emptyProfessions) {
    for (const city of emptyCities) {
      params.push({
        profession: profession.toLowerCase(),
        city: city.toLowerCase(),
        locale: 'fr' // Pour l'instant, seulement français
      });
    }
  }

  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { profession, city } = await params;

  if (!isValidCombination(profession, city)) {
    return {
      title: "Page non trouvée | Holia.me"
    };
  }

  const formattedProfession = formatProfession(profession);
  const formattedCity = formatCity(city);

  const title = `${formattedProfession} à ${formattedCity} : Prenez RDV en ligne | Holia`;
  const description = `Trouvez et réservez un rendez-vous avec un ${formattedProfession.toLowerCase()} à ${formattedCity}. Praticiens certifiés, paiement en ligne, avis vérifiés. Réservation instantanée 24/7.`;

  return {
    title,
    description,
    keywords: [
      formattedProfession.toLowerCase(),
      formattedCity,
      "rendez-vous",
      "réservation",
      "bien-être",
      "santé",
      "thérapie",
      "praticien",
      "Holia.me"
    ].join(", "),
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fr_FR",
      url: `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}/trouver/${profession}/${city}`,
    },
    alternates: {
      canonical: `/trouver/${profession}/${city}`,
    },
  };
}

export default async function ProfessionCityPage({ params }: PageProps) {
  const { profession, city } = await params;

  if (!isValidCombination(profession, city)) {
    notFound();
  }

  const formattedProfession = formatProfession(profession);
  const formattedCity = formatCity(city);
  const selectedTemplate = getTemplateForCity(formattedCity);

  // Chercher les praticiens dans cette ville avec cette profession
  const practitioners = await prisma.practitioners.findMany({
    where: {
      location_city: {
        equals: formattedCity,
        mode: 'insensitive' as const
      },
      title: {
        contains: formattedProfession,
        mode: 'insensitive' as const
      },
      is_active: true,
      OR: [
        { is_verified: true },
        { is_claimed: false }
      ]
    },
    include: {
      professions: true,
      services: {
        orderBy: {
          price_cents: 'asc'
        },
        take: 3 // Afficher les 3 premiers services
      },
      _count: {
        select: {
          reviews: true,
          appointments: true
        }
      },
      reviews: {
        where: {
          is_hidden: false
        },
        orderBy: {
          rating: 'desc'
        },
        take: 1, // Meilleur avis seulement
        include: {
          users: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      rating_avg: 'desc'
    }
  });

  // Transformer les données pour correspondre à l'interface Practitioner
  const transformedPractitioners = practitioners.map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    bio: p.bio,
    sourceUrl: p.source_url ?? null,
    address: p.address,
    locationCity: p.location_city,
    ratingAvg: p.rating_avg ?? 0,
    googleRating: p.google_rating ?? null,
    googleReviewCount: p.google_review_count ?? null,
    isVerified: p.is_verified,
    photoUrl: p.photo_url,
    phone: p.phone,
    website: p.website,
    profession: p.professions ? {
      id: p.professions.id,
      name: p.professions.name
    } : null,
    services: p.services.map(s => ({
      id: s.id,
      name: s.name,
      priceCents: s.price_cents,
      durationMin: s.duration_min
    })),
    _count: {
      reviews: p._count.reviews
    }
  }));

  // Calculer les statistiques
  const totalPractitioners = transformedPractitioners.length;
  const averagePrice = transformedPractitioners.length > 0
    ? Math.round(
        transformedPractitioners
          .flatMap(p => p.services?.map(s => s.priceCents) || [])
          .filter(price => price > 0)
          .reduce((sum, price, _, arr) => sum + price / arr.length, 0) / 100
      )
    : 0;

  // Trouver le meilleur avis
  const bestReview = practitioners
    .flatMap(p => p.reviews.map(r => ({ ...r, practitioner: p.title })))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];


  return (
    <main className="bg-[#f7f7f7] min-h-screen pt-28">
      {/* Header avec navigation */}
      <div className="bg-white border-b border-sable/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            href="/recherche"
            className="flex items-center gap-2 text-anthracite hover:text-sauge transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Retour à la recherche</span>
          </Link>

          <div className="flex items-center gap-2 text-sm text-anthracite/60 mb-2">
            <Link href="/" className="hover:text-sauge">Accueil</Link>
            <span>/</span>
            <Link href="/recherche" className="hover:text-sauge">Recherche</Link>
            <span>/</span>
            <span>{formattedProfession} à {formattedCity}</span>
          </div>

          <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
            {formattedProfession} à {formattedCity} : Prenez RDV en ligne
          </h1>

          <p className="text-anthracite/70">
            Trouvez et réservez un rendez-vous avec un {formattedProfession.toLowerCase()} à {formattedCity}.
            Praticiens certifiés, paiement en ligne, avis vérifiés.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          {/* Contenu principal */}
          <div className="space-y-8">
            {/* Section explicative */}
            <Card className="bg-white rounded-3xl shadow-sm border border-sable/10">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-anthracite">
                  Pourquoi choisir un {formattedProfession.toLowerCase()} à {formattedCity} ?
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <p className="text-anthracite/70 leading-relaxed mb-4">
                  {selectedTemplate.intro
                    .replace('{city}', formattedCity)
                    .replace('{profession}', formattedProfession.toLowerCase())}
                </p>
                <p className="text-anthracite/70 leading-relaxed mb-4">
                  Il y a actuellement <strong>{totalPractitioners} praticiens disponibles</strong> à {formattedCity} sur Holia.me,
                  tous sélectionnés pour leur expertise et leur engagement envers le bien-être de leurs clients.
                </p>
                <p className="text-anthracite/70 leading-relaxed">
                  {selectedTemplate.benefits}
                </p>

                <p className="text-anthracite/70 leading-relaxed mb-4">
                  Que vous cherchiez à améliorer votre bien-être général, à soulager des tensions physiques ou
                  émotionnelles, ou simplement à prendre soin de votre santé naturelle, nos {formattedProfession.toLowerCase()}s
                  à {formattedCity} sont là pour vous accompagner avec professionnalisme et bienveillance.
                </p>

                <div className="bg-sauge/5 rounded-3xl p-4 border border-sauge/20">
                  <h4 className="font-semibold text-anthracite mb-2">Avantages de réserver sur Holia.me :</h4>
                  <ul className="space-y-1 text-sm text-anthracite/70">
                    <li>✓ Praticiens vérifiés et certifiés</li>
                    <li>✓ Réservation en ligne 24/7</li>
                    <li>✓ Paiement sécurisé</li>
                    <li>✓ Avis clients authentiques</li>
                    <li>✓ Annulation gratuite (selon conditions)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Liste des praticiens */}
            <Card className="bg-white rounded-3xl shadow-sm border border-sable/10">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-anthracite">
                  {formattedProfession}s disponibles à {formattedCity}
                  {transformedPractitioners.length > 0 && (
                    <span className="text-sm font-normal text-anthracite/60 ml-2">
                      ({transformedPractitioners.length} praticien{transformedPractitioners.length > 1 ? 's' : ''})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PractitionersList
                  practitioners={transformedPractitioners}
                  emptyTitle={`Bientôt de nouveaux praticiens à ${formattedCity}`}
                  emptyDescription={`Aucun ${formattedProfession.toLowerCase()} n'est encore inscrit à ${formattedCity}. Soyez le premier à proposer vos services dans cette ville !`}
                  showCategory={false}
                />
              </CardContent>
            </Card>

            {/* Témoignage client (si disponible) */}
            {bestReview && (
              <Card className="bg-gradient-to-br from-sauge/5 to-sauge/10 border-sauge/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-sauge rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-lg">
                        {bestReview.users?.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < (bestReview.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                        <span className="text-sm text-anthracite/60 ml-2">
                          {bestReview.users?.name || 'Client anonyme'}
                        </span>
                      </div>
                      <blockquote className="text-anthracite/80 italic mb-3">
                        "{bestReview.comment}"
                      </blockquote>
                      <div className="text-sm text-anthracite/60">
                        Avec {bestReview.practitioner}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FAQ Section */}
            {averagePrice > 0 && (
              <Card className="bg-white rounded-3xl shadow-sm border border-sable/10">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-anthracite">
                    Questions fréquentes sur les {formattedProfession.toLowerCase()}s à {formattedCity}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-anthracite mb-2">
                      Quel est le prix moyen d'une séance de {formattedProfession.toLowerCase()} à {formattedCity} ?
                    </h4>
                    <p className="text-anthracite/70">
                      Le prix moyen d'une séance de {formattedProfession.toLowerCase()} à {formattedCity} est d'environ <strong>{averagePrice}€</strong>.
                      Les tarifs peuvent varier selon l'expérience du praticien et le type de consultation.
                      Tous les prix sont affichés transparently sur les profils des praticiens.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-anthracite mb-2">
                      Comment prendre rendez-vous avec un {formattedProfession.toLowerCase()} à {formattedCity} ?
                    </h4>
                    <p className="text-anthracite/70">
                      La prise de rendez-vous est simple et rapide sur Holia.me. Choisissez le praticien qui vous convient,
                      sélectionnez un créneau disponible dans son agenda, et validez votre réservation en ligne.
                      Vous recevrez une confirmation par email avec tous les détails de votre rendez-vous.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-anthracite mb-2">
                      Les praticiens à {formattedCity} sont-ils certifiés ?
                    </h4>
                    <p className="text-anthracite/70">
                      Tous les praticiens présents sur Holia.me sont soigneusement sélectionnés.
                      Les praticiens vérifiés (badge vert) ont été contrôlés par notre équipe.
                      Les praticiens non vérifiés (bandeau informatif) sont issus de sources fiables et peuvent être contactés directement.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-anthracite mb-2">
                      Puis-je annuler ou modifier mon rendez-vous ?
                    </h4>
                    <p className="text-anthracite/70">
                      Les conditions d'annulation varient selon les praticiens. La plupart proposent une annulation gratuite
                      jusqu'à 24-48h avant le rendez-vous. Vous pouvez gérer vos réservations directement depuis votre compte client.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* CTA pour praticiens */}
            <Card className="bg-gradient-to-br from-sauge/5 to-sauge/10 border-sauge/20">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto bg-sauge rounded-3xl flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-anthracite mb-2">
                  Vous êtes {formattedProfession.toLowerCase()} à {formattedCity} ?
                </h3>
                <p className="text-sm text-anthracite/70 mb-4">
                  Rejoignez Holia.me et développez votre activité en ligne.
                </p>
                <Button asChild className="w-full bg-sauge hover:bg-sauge-dark text-white">
                  <Link href="/pro">
                    Commencer gratuitement
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Statistiques locales */}
            <Card className="bg-white rounded-3xl shadow-sm border border-sable/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-anthracite">
                  {formattedCity} en chiffres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-anthracite/70">Praticiens inscrits</span>
                  <span className="font-semibold text-anthracite">{transformedPractitioners.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-anthracite/70">Métiers représentés</span>
                  <span className="font-semibold text-anthracite">
                    {new Set(transformedPractitioners.map(p => p.profession?.name)).size}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-anthracite/70">Avis clients</span>
                  <span className="font-semibold text-anthracite">
                    {transformedPractitioners.reduce((acc, p) => acc + p._count.reviews, 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}