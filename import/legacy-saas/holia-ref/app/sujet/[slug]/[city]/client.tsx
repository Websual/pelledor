"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, CardFooter } from "@/components/ui";
import Link from "next/link";
import { MapPin, User, Calendar, ArrowLeft, Heart, Sparkles, Brain, Moon, Activity, Baby, Users, Shield, Apple, Star, ChevronLeft, ChevronRight, Clock, Euro, Globe, Languages as LanguagesIcon } from "lucide-react";
import { SubjectMap } from "@/components/subject-map";
import { SimpleAvailability } from "@/components/simple-availability";
import { FavoriteButton } from "@/components/favorite-button";
import { FAQAccordion } from "@/components/faq-accordion";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

// Map des icônes par nom (même logique que BesoinCards)
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

// Templates variés pour le contenu descriptif des sujets
const SUBJECT_DESCRIPTION_TEMPLATES = [
  {
    intro: "Vous cherchez des solutions naturelles pour soulager vos {subject} à {city} ? Découvrez les meilleurs praticiens spécialisés dans l'accompagnement de ces troubles.",
    benefits: "Nos thérapeutes utilisent des approches holistiques et personnalisées pour vous aider à retrouver équilibre et bien-être."
  },
  {
    intro: "À {city}, plusieurs praticiens peuvent vous accompagner efficacement dans la gestion de vos {subject}. Holia.me vous aide à trouver le professionnel adapté à vos besoins.",
    benefits: "Bénéficiez d'un accompagnement professionnel avec des méthodes éprouvées et des résultats durables pour votre santé."
  },
  {
    intro: "Les {subject} peuvent être soulagés grâce aux thérapies naturelles disponibles à {city}. Nos praticiens experts vous proposent des solutions personnalisées.",
    benefits: "Chaque consultation est adaptée à votre situation personnelle pour des résultats optimaux et durables."
  },
  {
    intro: "Vous souhaitez améliorer votre qualité de vie en traitant vos {subject} à {city} ? Découvrez notre sélection de praticiens spécialisés dans ces accompagnements.",
    benefits: "Profitez d'un suivi personnalisé avec des professionnels engagés dans votre bien-être et votre santé naturelle."
  },
  {
    intro: "À {city}, des praticiens qualifiés peuvent vous aider à mieux gérer vos {subject} grâce à des approches complémentaires et naturelles.",
    benefits: "Nos thérapeutes vous accompagnent avec bienveillance et professionnalisme pour retrouver sérénité et vitalité."
  }
];

// Fonction pour sélectionner un template basé sur le hash de la ville
function getSubjectTemplateForCity(city: string): typeof SUBJECT_DESCRIPTION_TEMPLATES[0] {
  const hash = city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SUBJECT_DESCRIPTION_TEMPLATES[hash % SUBJECT_DESCRIPTION_TEMPLATES.length];
}

interface SubjectCityClientProps {
  subject: any;
  formattedCity: string;
  practitioners: any[];
  selectedTemplate: any;
  cityCoords?: { lat: number; lng: number } | null;
  professionIds?: string[];
  useRadiusSearch?: boolean;
  useRegionSearch?: boolean;
  regionName?: string | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function SubjectCityClient({
  subject,
  formattedCity,
  practitioners: initialPractitioners,
  selectedTemplate,
  cityCoords,
  professionIds = [],
  useRadiusSearch = false,
  useRegionSearch = false,
  regionName = null,
  pagination
}: SubjectCityClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string | undefined>();

  // Utiliser les praticiens reçus du serveur
  const practitioners = initialPractitioners;

  // Ref pour contrôler la carte
  const mapFlyToRef = useRef<((coords: { lat: number; lng: number }) => void) | null>(null);

  // Fonction pour changer de page sans recharger la carte
  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete('page');
    } else {
      params.set('page', newPage.toString());
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newUrl, { scroll: false });
  };

  // PILOTAGE CARTE : Centrer sur la ville au montage
  useEffect(() => {
    if (cityCoords && mapFlyToRef.current) {
      // Utiliser les coordonnées déjà géocodées
      mapFlyToRef.current(cityCoords);
    } else if (formattedCity && !cityCoords) {
      // Géocoder si on n'a pas encore les coordonnées
      fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(formattedCity)}&type=municipality&limit=1`)
        .then(response => response.json())
        .then(data => {
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].geometry.coordinates;
            if (mapFlyToRef.current) {
              mapFlyToRef.current({ lat, lng });
            }
          }
        })
        .catch(error => {
          console.error('Erreur géocodage ville sujet:', error);
        });
    }
  }, [formattedCity, cityCoords]);

  // Calculer les statistiques
  const totalPractitioners = pagination?.total || practitioners.length;
  const averageRating = practitioners.length > 0
    ? practitioners.reduce((sum, p) => sum + (p.rating_avg || 0), 0) / practitioners.length
    : 0;

  // Conseils IA spécifiques par sujet
  const getSubjectAdvice = (slug: string): string => {
    const adviceMap: Record<string, string> = {
      'sommeil': 'La mélatonine naturelle peut vous aider à réguler votre cycle de sommeil. Les techniques de relaxation comme la sophrologie ou la méditation sont également efficaces pour améliorer la qualité de votre repos.',
      'stress-anxiete': 'La cohérence cardiaque et la respiration profonde sont des techniques simples et efficaces pour gérer le stress au quotidien. Un accompagnement personnalisé peut vous aider à identifier les sources de votre anxiété.',
      'douleurs': 'Les massages thérapeutiques et les techniques de kinésithérapie douce peuvent soulager les tensions musculaires. L\'acupuncture et l\'ostéopathie offrent également des solutions naturelles.',
      'digestion': 'Une alimentation adaptée et des techniques de relaxation peuvent améliorer votre digestion. La naturopathie peut vous aider à identifier les intolérances alimentaires.',
      'sport-performance': 'La préparation mentale et la récupération active sont essentielles pour optimiser vos performances. Un suivi personnalisé peut vous aider à atteindre vos objectifs.',
      'grossesse': 'Le bien-être pendant la grossesse est essentiel. Les massages prénatals et la sophrologie peuvent vous accompagner tout au long de cette période.',
      'enfants': 'Les techniques douces comme la sophrologie adaptée aux enfants peuvent les aider à gérer leurs émotions et améliorer leur concentration.',
      'seniors': 'Le maintien de la mobilité et du bien-être est important. Des techniques adaptées peuvent vous aider à préserver votre autonomie.',
      'allergies': 'La naturopathie peut vous aider à renforcer votre système immunitaire et identifier les facteurs déclenchants de vos allergies.',
      'peau': 'Une approche holistique combinant soins externes et équilibre interne peut améliorer la santé de votre peau.'
    };
    return adviceMap[slug] || 'Un accompagnement personnalisé par un praticien spécialisé peut vous aider à trouver des solutions adaptées à vos besoins.';
  };

  const breadcrumbItems = [
    { label: "Holia", href: "/" },
    { label: subject.name, href: `/sujet/${subject.slug}` },
    { label: formattedCity }
  ];

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  // Helper pour formater le texte de localisation
  const getLocationText = (prefix: string = '') => {
    if (useRadiusSearch) {
      return `${prefix}autour de ${formattedCity}`;
    }
    return `${prefix}à ${formattedCity}`;
  };

  // Générer les variantes de FAQ pour éviter le duplicate content
  const getFAQContent = (slug: string, city: string) => {
    const locationText = useRadiusSearch ? 'autour de' : 'à';
    
    // 3 variantes de FAQ par sujet
    const faqVariants: Record<string, Array<Array<{ question: string; answer: string }>>> = {
      'stress-anxiete': [
        [
          {
            question: `Comment trouver un praticien spécialisé en gestion du stress ${locationText} ${city} ?`,
            answer: `À ${city}, plusieurs praticiens qualifiés proposent des approches naturelles pour gérer le stress et l'anxiété. La sophrologie, l'hypnothérapie et la psychologie sont particulièrement efficaces. Holia.me vous aide à trouver le professionnel adapté à vos besoins spécifiques.`
          },
          {
            question: `Quelles sont les meilleures techniques naturelles pour réduire le stress ${locationText} ${city} ?`,
            answer: `Les praticiens ${locationText} ${city} utilisent des méthodes comme la cohérence cardiaque, la méditation de pleine conscience et la relaxation progressive. Ces techniques, combinées à un accompagnement personnalisé, permettent de réduire significativement le stress au quotidien.`
          },
          {
            question: `Combien coûte une séance de gestion du stress ${locationText} ${city} ?`,
            answer: `Les tarifs varient selon le praticien et le type de séance. En moyenne, comptez entre 50€ et 80€ pour une consultation ${locationText} ${city}. Certains praticiens proposent des forfaits pour un suivi à long terme.`
          },
          {
            question: `Quelle est la différence entre un sophrologue et un psychologue ${locationText} ${city} ?`,
            answer: `Le sophrologue se concentre sur des techniques de relaxation et de gestion du stress, tandis que le psychologue travaille sur l'analyse des causes profondes de l'anxiété. Les deux approches sont complémentaires et peuvent être combinées pour un meilleur résultat.`
          },
          {
            question: `Comment préparer ma première séance ${locationText} ${city} ?`,
            answer: `Pour votre première séance ${locationText} ${city}, préparez-vous à discuter de vos besoins et de vos attentes. Le praticien vous posera des questions pour mieux comprendre votre situation et adapter son approche à votre profil.`
          },
          {
            question: `Les séances sont-elles adaptées aux enfants ${locationText} ${city} ?`,
            answer: `Oui, de nombreux praticiens ${locationText} ${city} proposent des séances adaptées aux enfants et aux adolescents. Les techniques sont simplifiées et ludiques pour permettre aux plus jeunes de mieux gérer leur stress et leurs émotions.`
          },
          {
            question: `Puis-je combiner plusieurs approches ${locationText} ${city} ?`,
            answer: `Absolument. De nombreux praticiens ${locationText} ${city} combinent plusieurs techniques (sophrologie, hypnothérapie, méditation) pour un accompagnement personnalisé et complet. N'hésitez pas à discuter de vos préférences lors de la première consultation.`
          }
        ],
        [
          {
            question: `Pourquoi consulter un praticien en gestion du stress ${locationText} ${city} ?`,
            answer: `Le stress chronique peut avoir des conséquences sur votre santé physique et mentale. Les praticiens ${locationText} ${city} vous accompagnent avec des méthodes douces et naturelles pour retrouver votre équilibre et améliorer votre qualité de vie.`
          },
          {
            question: `Quels praticiens sont recommandés pour le stress ${locationText} ${city} ?`,
            answer: `Holia recommande notamment les sophrologues, hypnothérapeutes et psychologues spécialisés dans la gestion du stress. Chaque praticien ${locationText} ${city} apporte son expertise unique pour vous aider à mieux gérer vos émotions.`
          },
          {
            question: `Combien de séances sont nécessaires pour voir des résultats ${locationText} ${city} ?`,
            answer: `Cela dépend de votre situation personnelle. En général, 3 à 6 séances suffisent pour apprendre les techniques de base. Un suivi régulier peut être bénéfique pour maintenir les résultats à long terme.`
          },
          {
            question: `Les séances peuvent-elles se faire en ligne ${locationText} ${city} ?`,
            answer: `Oui, de nombreux praticiens ${locationText} ${city} proposent des consultations en ligne. C'est une solution pratique qui permet de bénéficier d'un accompagnement professionnel depuis chez vous.`
          },
          {
            question: `Quels sont les bienfaits à long terme de la gestion du stress ${locationText} ${city} ?`,
            answer: `Un suivi régulier avec un praticien ${locationText} ${city} permet d'améliorer durablement votre qualité de vie, votre sommeil, votre concentration et votre bien-être général. Les techniques apprises vous accompagnent tout au long de votre vie.`
          },
          {
            question: `Comment savoir si j'ai besoin d'un accompagnement ${locationText} ${city} ?`,
            answer: `Si le stress impacte votre quotidien (sommeil, concentration, relations), il est temps de consulter. Les praticiens ${locationText} ${city} peuvent vous aider à identifier les signaux d'alarme et vous proposer des solutions adaptées.`
          },
          {
            question: `Les mutuelles remboursent-elles les séances ${locationText} ${city} ?`,
            answer: `Certaines mutuelles proposent des forfaits pour les médecines douces. Renseignez-vous auprès de votre mutuelle ${locationText} ${city} pour connaître les conditions de remboursement des séances de sophrologie ou d'hypnothérapie.`
          }
        ],
        [
          {
            question: `Quelles approches naturelles sont disponibles ${locationText} ${city} pour le stress ?`,
            answer: `Les praticiens ${locationText} ${city} proposent diverses approches : sophrologie, hypnothérapie, méditation, acupuncture et psychologie. Chaque méthode a ses avantages et peut être adaptée à vos besoins spécifiques.`
          },
          {
            question: `Comment choisir le bon praticien ${locationText} ${city} ?`,
            answer: `Consultez les avis des patients, vérifiez les certifications et les spécialisations. Les praticiens ${locationText} ${city} sur Holia.me sont vérifiés et qualifiés. N'hésitez pas à contacter plusieurs professionnels pour trouver celui qui vous correspond.`
          },
          {
            question: `Le stress peut-il être traité naturellement ${locationText} ${city} ?`,
            answer: `Absolument. Les approches naturelles comme la sophrologie, la méditation et l'hypnothérapie sont très efficaces pour gérer le stress. Les praticiens ${locationText} ${city} vous enseignent des techniques que vous pouvez pratiquer au quotidien.`
          },
          {
            question: `Y a-t-il des praticiens spécialisés dans l'anxiété ${locationText} ${city} ?`,
            answer: `Oui, plusieurs praticiens ${locationText} ${city} se spécialisent dans le traitement de l'anxiété. Ils utilisent des méthodes adaptées comme la thérapie cognitive comportementale, l'hypnothérapie ou la sophrologie pour vous aider à surmonter vos peurs.`
          },
          {
            question: `Combien de temps dure une séance ${locationText} ${city} ?`,
            answer: `En général, une séance dure entre 45 minutes et 1 heure ${locationText} ${city}. La première consultation peut être plus longue (1h30) pour permettre au praticien de bien comprendre votre situation et vos besoins.`
          },
          {
            question: `Puis-je suivre des séances en groupe ${locationText} ${city} ?`,
            answer: `Certains praticiens ${locationText} ${city} proposent des séances de groupe, particulièrement pour la sophrologie et la méditation. C'est une option économique et conviviale qui permet aussi d'échanger avec d'autres participants.`
          },
          {
            question: `Quelle est la fréquence recommandée des séances ${locationText} ${city} ?`,
            answer: `Pour un suivi efficace, comptez généralement une séance par semaine au début, puis espacées à une fois toutes les deux semaines ou par mois selon vos progrès. Votre praticien ${locationText} ${city} vous conseillera la fréquence adaptée à votre situation.`
          }
        ]
      ],
      'sommeil': [
        [
          {
            question: `Comment améliorer mon sommeil naturellement ${locationText} ${city} ?`,
            answer: `Les praticiens ${locationText} ${city} proposent des solutions naturelles comme la sophrologie, l'hypnothérapie et la naturopathie. Ces approches vous aident à identifier les causes de vos troubles du sommeil et à retrouver un repos réparateur.`
          },
          {
            question: `Quels praticiens sont spécialisés dans les troubles du sommeil ${locationText} ${city} ?`,
            answer: `À ${city}, vous trouverez des sophrologues, hypnothérapeutes et naturopathes spécialisés dans les troubles du sommeil. Holia.me vous aide à trouver le professionnel le plus adapté à votre situation.`
          },
          {
            question: `Combien de temps faut-il pour réguler son sommeil ${locationText} ${city} ?`,
            answer: `Avec un accompagnement adapté, vous pouvez voir des améliorations dès les premières séances. En général, 4 à 8 consultations suffisent pour établir de nouvelles habitudes de sommeil et retrouver un rythme naturel.`
          },
          {
            question: `La mélatonine naturelle est-elle efficace ${locationText} ${city} ?`,
            answer: `Oui, les naturopathes ${locationText} ${city} peuvent vous conseiller sur l'utilisation de la mélatonine naturelle. Combinée à des techniques de relaxation, elle peut significativement améliorer la qualité de votre sommeil.`
          },
          {
            question: `Comment créer un environnement propice au sommeil ${locationText} ${city} ?`,
            answer: `Les praticiens ${locationText} ${city} vous conseillent sur l'aménagement de votre chambre, les rituels du coucher et les habitudes à adopter pour favoriser un sommeil réparateur. Ces conseils personnalisés font partie intégrante de l'accompagnement.`
          },
          {
            question: `Les troubles du sommeil peuvent-ils être liés à l'alimentation ${locationText} ${city} ?`,
            answer: `Oui, l'alimentation joue un rôle important dans la qualité du sommeil. Les naturopathes ${locationText} ${city} peuvent vous aider à identifier les aliments qui perturbent votre sommeil et vous proposer des alternatives naturelles.`
          },
          {
            question: `Quelle est la différence entre insomnie et troubles du sommeil ${locationText} ${city} ?`,
            answer: `L'insomnie est un trouble spécifique caractérisé par des difficultés à s'endormir ou à rester endormi. Les troubles du sommeil englobent un spectre plus large incluant les réveils nocturnes, les cauchemars ou les rythmes décalés. Les praticiens ${locationText} ${city} adaptent leur approche selon votre situation.`
          }
        ],
        [
          {
            question: `Pourquoi consulter un praticien pour mes troubles du sommeil ${locationText} ${city} ?`,
            answer: `Les troubles du sommeil peuvent avoir de nombreuses causes. Les praticiens ${locationText} ${city} vous aident à identifier les facteurs perturbateurs et vous proposent des solutions personnalisées pour retrouver un sommeil de qualité.`
          },
          {
            question: `Quelles techniques sont utilisées ${locationText} ${city} pour améliorer le sommeil ?`,
            answer: `Les praticiens ${locationText} ${city} utilisent la sophrologie pour la relaxation, l'hypnothérapie pour reprogrammer les cycles, et la naturopathie pour équilibrer l'alimentation et les compléments naturels.`
          },
          {
            question: `Les séances peuvent-elles se faire à domicile ${locationText} ${city} ?`,
            answer: `Certains praticiens ${locationText} ${city} proposent des consultations à domicile ou en ligne. C'est particulièrement pratique pour les séances de relaxation qui peuvent se faire dans votre environnement familier.`
          },
          {
            question: `Quel est le coût moyen d'une consultation ${locationText} ${city} ?`,
            answer: `Les tarifs varient entre 50€ et 90€ selon le praticien et le type de séance ${locationText} ${city}. Certains professionnels proposent des forfaits pour un suivi complet sur plusieurs semaines.`
          },
          {
            question: `Les séances peuvent-elles aider les personnes travaillant de nuit ${locationText} ${city} ?`,
            answer: `Oui, les praticiens ${locationText} ${city} proposent des accompagnements spécifiques pour les personnes avec des horaires décalés. Ils vous aident à optimiser votre sommeil malgré les contraintes professionnelles.`
          },
          {
            question: `Combien de temps avant de voir des résultats ${locationText} ${city} ?`,
            answer: `Les premiers résultats peuvent être visibles dès les premières séances ${locationText} ${city}. Cependant, un suivi régulier sur 4 à 8 semaines est généralement recommandé pour établir de nouvelles habitudes durables.`
          },
          {
            question: `Les techniques apprises sont-elles applicables à domicile ${locationText} ${city} ?`,
            answer: `Absolument. Les praticiens ${locationText} ${city} vous enseignent des techniques que vous pouvez pratiquer quotidiennement chez vous. Ces exercices renforcent l'efficacité des séances et vous rendent autonome dans la gestion de votre sommeil.`
          }
        ],
        [
          {
            question: `Comment fonctionne la sophrologie pour le sommeil ${locationText} ${city} ?`,
            answer: `La sophrologie utilise des techniques de relaxation profonde et de visualisation pour vous aider à vous endormir plus facilement. Les praticiens ${locationText} ${city} vous enseignent des exercices que vous pouvez pratiquer chaque soir.`
          },
          {
            question: `L'hypnothérapie est-elle efficace pour l'insomnie ${locationText} ${city} ?`,
            answer: `Oui, l'hypnothérapie est très efficace pour traiter l'insomnie. Les praticiens ${locationText} ${city} utilisent cette méthode pour reprogrammer votre subconscient et retrouver un sommeil naturel et réparateur.`
          },
          {
            question: `Y a-t-il des praticiens spécialisés dans l'insomnie ${locationText} ${city} ?`,
            answer: `Plusieurs praticiens ${locationText} ${city} se spécialisent dans le traitement de l'insomnie. Ils combinent souvent plusieurs approches (sophrologie, hypnothérapie, naturopathie) pour un accompagnement complet.`
          },
          {
            question: `Peut-on traiter les réveils nocturnes ${locationText} ${city} ?`,
            answer: `Absolument. Les praticiens ${locationText} ${city} peuvent vous aider à comprendre les causes de vos réveils nocturnes et vous proposer des solutions pour retrouver un sommeil continu toute la nuit.`
          },
          {
            question: `Les séances sont-elles adaptées aux personnes âgées ${locationText} ${city} ?`,
            answer: `Oui, les praticiens ${locationText} ${city} adaptent leurs techniques aux besoins spécifiques des seniors. Les approches douces comme la sophrologie et la naturopathie sont particulièrement adaptées à cette population.`
          },
          {
            question: `Comment maintenir les résultats après les séances ${locationText} ${city} ?`,
            answer: `Les praticiens ${locationText} ${city} vous fournissent des outils et des exercices à pratiquer régulièrement. Un suivi ponctuel peut être recommandé pour maintenir les bénéfices à long terme et ajuster les techniques si nécessaire.`
          },
          {
            question: `Y a-t-il des contre-indications aux séances ${locationText} ${city} ?`,
            answer: `Les approches naturelles comme la sophrologie et l'hypnothérapie ont très peu de contre-indications. Cependant, il est important de discuter de votre état de santé avec le praticien ${locationText} ${city} lors de la première consultation.`
          }
        ]
      ],
      'douleurs': [
        [
          {
            question: `Comment soulager mes douleurs naturellement ${locationText} ${city} ?`,
            answer: `Les praticiens ${locationText} ${city} proposent des solutions naturelles comme l'ostéopathie, la chiropractie, l'acupuncture et la réflexologie. Ces méthodes douces peuvent soulager efficacement vos douleurs sans médicaments.`
          },
          {
            question: `Quels praticiens sont spécialisés dans le traitement des douleurs ${locationText} ${city} ?`,
            answer: `À ${city}, vous trouverez des ostéopathes, chiropracteurs, acupuncteurs et réflexologues spécialisés dans le traitement des douleurs chroniques et aiguës. Holia.me vous aide à trouver le professionnel adapté.`
          },
          {
            question: `Combien de séances sont nécessaires pour soulager les douleurs ${locationText} ${city} ?`,
            answer: `Cela dépend du type et de l'intensité de vos douleurs. En général, 2 à 4 séances suffisent pour voir une amélioration significative. Un suivi régulier peut être nécessaire pour les douleurs chroniques.`
          },
          {
            question: `L'ostéopathie est-elle efficace pour les douleurs dorsales ${locationText} ${city} ?`,
            answer: `Oui, l'ostéopathie est très efficace pour traiter les douleurs dorsales. Les praticiens ${locationText} ${city} utilisent des manipulations douces pour rétablir l'équilibre de votre corps et soulager les tensions.`
          },
          {
            question: `Comment se déroule une première séance ${locationText} ${city} ?`,
            answer: `Lors de votre première séance ${locationText} ${city}, le praticien effectue un bilan complet de votre situation (anamnèse), examine votre posture et vos mouvements, puis propose un plan de traitement personnalisé adapté à vos besoins.`
          },
          {
            question: `Les séances sont-elles douloureuses ${locationText} ${city} ?`,
            answer: `Non, les techniques utilisées par les praticiens ${locationText} ${city} sont généralement douces et non invasives. Vous pouvez ressentir une légère sensibilité après la séance, mais cela disparaît rapidement.`
          },
          {
            question: `Puis-je consulter en prévention ${locationText} ${city} ?`,
            answer: `Absolument. De nombreuses personnes consultent les praticiens ${locationText} ${city} en prévention pour maintenir leur mobilité, prévenir les douleurs chroniques et optimiser leur bien-être général.`
          }
        ],
        [
          {
            question: `Pourquoi consulter un praticien pour mes douleurs ${locationText} ${city} ?`,
            answer: `Les douleurs chroniques peuvent impacter votre qualité de vie. Les praticiens ${locationText} ${city} vous proposent des solutions naturelles et durables pour retrouver votre bien-être sans dépendre aux médicaments.`
          },
          {
            question: `Quelle est la différence entre un ostéopathe et un chiropracteur ${locationText} ${city} ?`,
            answer: `L'ostéopathe travaille sur l'ensemble du corps et les fascias, tandis que le chiropracteur se concentre sur la colonne vertébrale. Les deux approches sont complémentaires et très efficaces ${locationText} ${city}.`
          },
          {
            question: `L'acupuncture peut-elle soulager les douleurs ${locationText} ${city} ?`,
            answer: `Oui, l'acupuncture est reconnue pour son efficacité contre les douleurs. Les praticiens ${locationText} ${city} utilisent cette technique millénaire pour stimuler les points d'énergie et réduire la douleur naturellement.`
          },
          {
            question: `Les séances sont-elles remboursées ${locationText} ${city} ?`,
            answer: `Certaines mutuelles remboursent partiellement les séances d'ostéopathie, chiropractie ou acupuncture. Renseignez-vous auprès de votre mutuelle ${locationText} ${city} pour connaître les conditions de remboursement.`
          },
          {
            question: `Combien de séances sont nécessaires pour un résultat durable ${locationText} ${city} ?`,
            answer: `Cela dépend de la nature et de l'ancienneté de vos douleurs. En général, 2 à 4 séances suffisent pour les douleurs aiguës, tandis qu'un suivi plus régulier peut être nécessaire pour les douleurs chroniques ${locationText} ${city}.`
          },
          {
            question: `Les praticiens peuvent-ils travailler en complément de la médecine traditionnelle ${locationText} ${city} ?`,
            answer: `Oui, les approches naturelles complètent parfaitement la médecine traditionnelle. Les praticiens ${locationText} ${city} travaillent souvent en collaboration avec les médecins pour un accompagnement global de votre santé.`
          },
          {
            question: `Y a-t-il des précautions à prendre après une séance ${locationText} ${city} ?`,
            answer: `Les praticiens ${locationText} ${city} vous conseillent généralement de boire beaucoup d'eau, d'éviter les efforts intenses dans les 24-48h suivant la séance et de respecter les recommandations spécifiques qu'ils vous donnent.`
          }
        ],
        [
          {
            question: `Quelles techniques naturelles sont disponibles ${locationText} ${city} pour les douleurs ?`,
            answer: `Les praticiens ${locationText} ${city} proposent l'ostéopathie, la chiropractie, l'acupuncture, la réflexologie et le magnétisme. Chaque méthode a ses spécificités et peut être adaptée à votre type de douleur.`
          },
          {
            question: `Comment choisir le bon praticien ${locationText} ${city} pour mes douleurs ?`,
            answer: `Consultez les spécialisations, les avis des patients et les certifications. Les praticiens ${locationText} ${city} sur Holia.me sont vérifiés et qualifiés dans leur domaine d'expertise.`
          },
          {
            question: `Peut-on traiter les douleurs chroniques ${locationText} ${city} ?`,
            answer: `Absolument. Les praticiens ${locationText} ${city} sont spécialisés dans le traitement des douleurs chroniques. Ils proposent un accompagnement personnalisé pour améliorer votre qualité de vie sur le long terme.`
          },
          {
            question: `Y a-t-il des praticiens spécialisés dans les douleurs articulaires ${locationText} ${city} ?`,
            answer: `Oui, plusieurs praticiens ${locationText} ${city} se spécialisent dans le traitement des douleurs articulaires. L'ostéopathie et l'acupuncture sont particulièrement efficaces pour ce type de douleurs.`
          },
          {
            question: `Les séances peuvent-elles aider les sportifs ${locationText} ${city} ?`,
            answer: `Absolument. Les praticiens ${locationText} ${city} proposent des accompagnements spécifiques pour les sportifs : récupération après l'effort, prévention des blessures, optimisation des performances.`
          },
          {
            question: `Comment choisir entre ostéopathe, chiropracteur et acupuncteur ${locationText} ${city} ?`,
            answer: `L'ostéopathe travaille sur l'ensemble du corps, le chiropracteur se concentre sur la colonne vertébrale, et l'acupuncteur utilise les points d'énergie. Consultez les profils des praticiens ${locationText} ${city} sur Holia.me pour trouver celui qui correspond à vos besoins.`
          },
          {
            question: `Les séances sont-elles adaptées aux enfants ${locationText} ${city} ?`,
            answer: `Oui, de nombreux praticiens ${locationText} ${city} sont spécialisés en pédiatrie. L'ostéopathie pédiatrique est particulièrement douce et adaptée aux bébés et enfants pour traiter divers troubles.`
          }
        ]
      ],
      'digestion': [
        [
          {
            question: `Comment améliorer ma digestion naturellement ${locationText} ${city} ?`,
            answer: `Les praticiens ${locationText} ${city} proposent des solutions naturelles comme la naturopathie, la diététique et la réflexologie. Ces approches vous aident à identifier les causes de vos troubles digestifs et à retrouver un équilibre.`
          },
          {
            question: `Quels praticiens sont spécialisés dans les troubles digestifs ${locationText} ${city} ?`,
            answer: `À ${city}, vous trouverez des naturopathes, diététiciens et réflexologues spécialisés dans les troubles digestifs. Holia.me vous aide à trouver le professionnel le plus adapté à votre situation.`
          },
          {
            question: `Combien de temps faut-il pour améliorer la digestion ${locationText} ${city} ?`,
            answer: `Avec un accompagnement adapté, vous pouvez voir des améliorations dès les premières semaines. En général, 3 à 6 consultations suffisent pour établir de nouvelles habitudes alimentaires et retrouver un équilibre digestif.`
          },
          {
            question: `La naturopathie peut-elle aider pour les intolérances alimentaires ${locationText} ${city} ?`,
            answer: `Oui, les naturopathes ${locationText} ${city} peuvent vous aider à identifier les intolérances alimentaires et vous proposer des solutions naturelles pour retrouver un confort digestif optimal.`
          },
          {
            question: `Comment se déroule un suivi nutritionnel ${locationText} ${city} ?`,
            answer: `Le praticien ${locationText} ${city} analyse vos habitudes alimentaires, identifie les aliments problématiques et vous propose un plan alimentaire personnalisé. Un suivi régulier permet d'ajuster le programme selon vos progrès.`
          },
          {
            question: `Les séances peuvent-elles aider pour la perte de poids ${locationText} ${city} ?`,
            answer: `Oui, les praticiens ${locationText} ${city} proposent des accompagnements pour la perte de poids en travaillant sur l'équilibre alimentaire, le métabolisme et les habitudes de vie. L'approche est globale et durable.`
          },
          {
            question: `Quelle est la différence entre un naturopathe et un diététicien ${locationText} ${city} ?`,
            answer: `Le naturopathe utilise une approche holistique incluant plantes, compléments et hygiène de vie. Le diététicien se concentre sur l'alimentation et les aspects nutritionnels. Les deux approches sont complémentaires ${locationText} ${city}.`
          }
        ],
        [
          {
            question: `Pourquoi consulter un praticien pour mes troubles digestifs ${locationText} ${city} ?`,
            answer: `Les troubles digestifs peuvent avoir de nombreuses causes. Les praticiens ${locationText} ${city} vous aident à identifier les facteurs déclenchants et vous proposent des solutions personnalisées pour retrouver un équilibre digestif.`
          },
          {
            question: `Quelles techniques sont utilisées ${locationText} ${city} pour améliorer la digestion ?`,
            answer: `Les praticiens ${locationText} ${city} utilisent la naturopathie pour équilibrer l'alimentation, la diététique pour personnaliser les repas, et la réflexologie pour stimuler les zones digestives.`
          },
          {
            question: `Les séances peuvent-elles se faire en ligne ${locationText} ${city} ?`,
            answer: `Oui, de nombreux praticiens ${locationText} ${city} proposent des consultations en ligne. C'est particulièrement pratique pour les suivis nutritionnels et les conseils en naturopathie.`
          },
          {
            question: `Quel est le coût moyen d'une consultation ${locationText} ${city} ?`,
            answer: `Les tarifs varient entre 50€ et 80€ selon le praticien et le type de séance ${locationText} ${city}. Certains professionnels proposent des forfaits pour un suivi complet sur plusieurs mois.`
          },
          {
            question: `Les séances peuvent-elles aider pour le syndrome de l'intestin irritable ${locationText} ${city} ?`,
            answer: `Oui, les praticiens ${locationText} ${city} proposent des accompagnements spécifiques pour le SII en combinant naturopathie, diététique et techniques de gestion du stress qui impactent directement la digestion.`
          },
          {
            question: `Combien de temps avant de voir des améliorations ${locationText} ${city} ?`,
            answer: `Les premiers résultats peuvent être visibles dès les premières semaines ${locationText} ${city}. Cependant, un suivi de 3 à 6 mois est généralement recommandé pour établir de nouvelles habitudes alimentaires durables et observer des améliorations significatives.`
          },
          {
            question: `Les praticiens proposent-ils des menus personnalisés ${locationText} ${city} ?`,
            answer: `Oui, les diététiciens et naturopathes ${locationText} ${city} peuvent vous proposer des menus personnalisés adaptés à vos besoins, vos goûts et vos contraintes. Ces plans sont évolutifs et s'ajustent selon vos progrès.`
          }
        ],
        [
          {
            question: `Comment fonctionne la naturopathie pour la digestion ${locationText} ${city} ?`,
            answer: `La naturopathie utilise des techniques naturelles comme l'alimentation adaptée, les plantes médicinales et les compléments pour rétablir l'équilibre digestif. Les praticiens ${locationText} ${city} vous accompagnent dans cette démarche.`
          },
          {
            question: `La réflexologie peut-elle améliorer la digestion ${locationText} ${city} ?`,
            answer: `Oui, la réflexologie est efficace pour stimuler les zones digestives. Les praticiens ${locationText} ${city} utilisent cette technique pour améliorer le transit et réduire les troubles digestifs.`
          },
          {
            question: `Y a-t-il des praticiens spécialisés dans le syndrome de l'intestin irritable ${locationText} ${city} ?`,
            answer: `Plusieurs praticiens ${locationText} ${city} se spécialisent dans le traitement du syndrome de l'intestin irritable. Ils combinent souvent naturopathie et diététique pour un accompagnement complet.`
          },
          {
            question: `Peut-on traiter les ballonnements ${locationText} ${city} ?`,
            answer: `Absolument. Les praticiens ${locationText} ${city} peuvent vous aider à comprendre les causes de vos ballonnements et vous proposer des solutions naturelles pour retrouver un confort digestif.`
          },
          {
            question: `Les séances sont-elles adaptées aux végétariens et vegans ${locationText} ${city} ?`,
            answer: `Oui, les praticiens ${locationText} ${city} sont formés pour accompagner tous les régimes alimentaires. Ils peuvent vous aider à équilibrer votre alimentation végétarienne ou végane tout en respectant vos choix éthiques.`
          },
          {
            question: `Comment maintenir les résultats après le suivi ${locationText} ${city} ?`,
            answer: `Les praticiens ${locationText} ${city} vous fournissent des outils et des connaissances pour maintenir les résultats. Un suivi ponctuel peut être recommandé pour ajuster votre alimentation selon l'évolution de vos besoins.`
          },
          {
            question: `Les séances peuvent-elles aider pour les problèmes de transit ${locationText} ${city} ?`,
            answer: `Oui, les praticiens ${locationText} ${city} proposent des solutions naturelles pour réguler le transit intestinal. L'alimentation, l'hydratation et les techniques de réflexologie sont particulièrement efficaces.`
          }
        ]
      ],
      // Variantes génériques pour les autres sujets
    };

    // Sélectionner une variante basée sur le hash de la ville pour garantir la cohérence
    const cityHash = city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variantIndex = cityHash % 3;
    
    const defaultFAQ = [
      {
        question: `Comment trouver un praticien spécialisé ${locationText} ${city} ?`,
        answer: `Holia.me vous aide à trouver les meilleurs praticiens ${locationText} ${city}. Consultez les profils, les avis et les spécialisations pour choisir le professionnel adapté à vos besoins.`
      },
      {
        question: `Quelles sont les approches naturelles disponibles ${locationText} ${city} ?`,
        answer: `Les praticiens ${locationText} ${city} proposent diverses approches naturelles et holistiques. Chaque méthode est adaptée à votre situation personnelle pour des résultats optimaux.`
      },
      {
        question: `Combien coûte une consultation ${locationText} ${city} ?`,
        answer: `Les tarifs varient selon le praticien et le type de séance. Consultez les profils des praticiens ${locationText} ${city} sur Holia.me pour connaître les tarifs détaillés.`
      },
      {
        question: `Comment préparer ma première séance ${locationText} ${city} ?`,
        answer: `Pour votre première consultation ${locationText} ${city}, préparez-vous à discuter de vos besoins, de votre historique médical et de vos attentes. Le praticien vous posera des questions pour mieux comprendre votre situation.`
      },
      {
        question: `Les séances sont-elles remboursées par la mutuelle ${locationText} ${city} ?`,
        answer: `Certaines mutuelles proposent des forfaits pour les médecines douces. Renseignez-vous auprès de votre mutuelle ${locationText} ${city} pour connaître les conditions de remboursement selon le type de praticien.`
      },
      {
        question: `Combien de séances sont généralement nécessaires ${locationText} ${city} ?`,
        answer: `Cela dépend de votre situation personnelle et de vos objectifs. En général, comptez entre 3 et 6 séances pour un suivi initial, avec possibilité de consultations ponctuelles par la suite selon vos besoins.`
      }
    ];

    return faqVariants[slug]?.[variantIndex] || defaultFAQ;
  };

  // Récupérer les 3 praticiens les plus populaires pour la citation
  const getTopPractitioners = () => {
    if (practitioners.length === 0) return [];
    
    return practitioners
      .sort((a: any, b: any) => {
        // Trier par note moyenne puis par nombre d'avis
        if (b.rating_avg !== a.rating_avg) {
          return (b.rating_avg || 0) - (a.rating_avg || 0);
        }
        return (b._count?.reviews || 0) - (a._count?.reviews || 0);
      })
      .slice(0, 3)
      .map((p: any) => p.title);
  };

  // Composant pour le rendu des praticiens avec carte
  const renderPractitionersWithMap = () => {
    // Ne plus afficher "Aucun praticien trouvé" car on cherche toujours dans la région
    if (!practitioners || practitioners.length === 0) {
      return null;
    }

    return (
      <>
        {/* Liste des praticiens à gauche (45%) */}
        <div className="overflow-y-auto border-r-0 md:border-r border-sable order-1 md:order-1 bg-white">
          {/* Titre et texte */}
          <div className="p-4 md:p-6 pb-4 border-b border-sable bg-white">
            <h1 className="text-xl md:text-2xl font-bold font-heading text-anthracite mb-2">
              Praticiens spécialisés en {subject.name.toLowerCase()}
            </h1>
            <p className="text-sm md:text-base text-anthracite/70">
                    {pagination?.total || practitioners.length} praticien(s) trouvé(s) {useRegionSearch ? 'dans votre région' : useRadiusSearch ? 'autour de' : 'à'} {formattedCity} • {useRegionSearch || useRadiusSearch ? 'Triés par distance' : 'Triés par pertinence'}
            </p>
          </div>

          {/* Liste des praticiens */}
          <div>
            {practitioners.map((practitioner) => {
              const minServicePrice = practitioner.services.length > 0
                ? Math.min(...practitioner.services.map((s: any) => s.price_cents))
                : null;

              return (
                <div
                  key={practitioner.id}
                  id={`practitioner-${practitioner.id}`}
                  className={`flex flex-col md:flex-row border-b border-sable ${
                    selectedPractitionerId === practitioner.id ? "bg-sauge/5" : ""
                  }`}
                >
                  {/* Image à gauche (30-35%) */}
                  <div className="w-full md:w-[32%] flex-shrink-0 relative self-stretch">
                    {practitioner.photo_url ? (
                      <Image
                        src={practitioner.photo_url}
                        alt={practitioner.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 32vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-[#9bb49b]/10 flex items-center justify-center">
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

                  {/* Contenu à droite */}
                  <div className="flex-1 p-4 md:p-6 relative">
                    {/* Badge profil certifié (uniquement si non réclamé et 0 avis) */}
                    {!practitioner.is_claimed && (practitioner._count?.reviews || 0) === 0 && (
                      <div className="absolute top-4 right-4 md:top-6 md:right-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-2xl bg-[#9bb49b]/10 text-[#9bb49b] text-xs font-medium border border-[#9bb49b]/30">
                          🛡️ Profil certifié (Données publiques)
                        </span>
                      </div>
                    )}

                    {/* Nom du praticien */}
                    <Link
                      href={`/praticien/${practitioner.slug}`}
                      className="hover:text-sauge transition-colors"
                    >
                      <h3 className="text-lg md:text-xl font-bold font-heading text-anthracite mb-2 hover:underline">
                        {practitioner.title}
                      </h3>
                    </Link>

                    {/* Adresse */}
                    <div className="flex items-center gap-1 text-xs md:text-sm text-anthracite/70 mb-3">
                      <MapPin className="h-3 w-3 md:h-4 md:w-4 text-anthracite/60" />
                      <span>
                        {practitioner.address && `${practitioner.address}, `}
                        {practitioner.location_city}
                      </span>
                    </div>

                    {/* Avis + Prix — masquer les étoiles si non réclamé ET 0 avis */}
                    {(!practitioner.is_claimed && (practitioner._count?.reviews || 0) === 0) ? null : (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs md:text-sm font-semibold text-anthracite">
                            {practitioner.rating_avg?.toFixed(1).replace(".", ",") || "0,0"} ({(practitioner._count?.reviews || 0)} avis)
                          </span>
                        </div>
                        {minServicePrice && !isNaN(minServicePrice) && (
                          <span className="text-xs md:text-sm font-semibold text-anthracite">
                            À partir de {formatPrice(minServicePrice).replace(".", ",")} €
                          </span>
                        )}
                      </div>
                    )}
                    {(!practitioner.is_claimed && (practitioner._count?.reviews || 0) === 0) && minServicePrice && !isNaN(minServicePrice) && (
                      <div className="mb-4">
                        <span className="text-xs md:text-sm font-semibold text-anthracite">
                          À partir de {formatPrice(minServicePrice).replace(".", ",")} €
                        </span>
                      </div>
                    )}

                    {/* Consultation vidéo si disponible */}
                    {(() => {
                      const videoService = practitioner.services?.find((s: any) => s.location_type === "VIDEO_ONLY" || s.location_type === "HYBRID");
                      if (videoService) {
                        return (
                          <div className="mb-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sauge/10 border border-sauge/30 rounded-2xl">
                              <svg className="w-4 h-4 text-sauge" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs font-medium text-sauge">Consultation vidéo disponible</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Calendrier simplifié ou placeholder si non réclamé */}
                    <div className="mb-4">
                      {practitioner.is_claimed ? (
                        <SimpleAvailability
                          practitionerId={practitioner.id}
                          serviceId={practitioner.services?.find((s: any) => s.is_video === true)?.id || practitioner.services[0]?.id || null}
                        />
                      ) : (
                        <div className="rounded-xl p-4 bg-[#9bb49b]/5 border border-[#9bb49b]/20 text-center">
                          <p className="text-sm text-anthracite/70">
                            La prise de rendez-vous en ligne n&apos;est pas encore activée pour ce praticien.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Boutons ou lien selon réclamation */}
                    {practitioner.is_claimed ? (
                      <Link
                        href={`/praticien/${practitioner.slug}`}
                        className="text-xs md:text-sm text-sauge hover:underline"
                      >
                        Plus d'informations
                      </Link>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="bg-[#9bb49b] hover:bg-[#8aa483] text-white">
                          <Link href={`/praticien/${practitioner.slug}`}>Voir la fiche</Link>
                        </Button>
                        {session?.user ? (
                          <span
                            className="inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-medium bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-200"
                            aria-disabled="true"
                          >
                            Réclamez ce profil (réservé aux visiteurs non connectés)
                          </span>
                        ) : (
                          <Button asChild variant="outline" size="sm" className="border-sauge/50 text-sauge hover:bg-sauge/5">
                            <Link href={`/inscription?claim=${practitioner.id}`}>C&apos;est vous ? Réclamez ce profil</Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carte à droite (55%) - Toujours visible, indépendante du chargement */}
        <div className="h-[400px] md:h-full order-2 md:order-2" style={{ pointerEvents: "auto", position: "relative", zIndex: 10 }}>
          <SubjectMap
            key={`map-${subject.id}-${formattedCity}-${useRadiusSearch}`}
            selectedPractitionerId={selectedPractitionerId}
            onPractitionerSelect={setSelectedPractitionerId}
            searchCity={formattedCity}
            subjectId={subject.id}
            cityZoom={12}
            initialCenter={cityCoords || null}
            useRadiusSearch={useRadiusSearch}
            onMapReady={(flyToFn) => {
              mapFlyToRef.current = flyToFn;
            }}
          />
        </div>
      </>
    );
  };

  return (
    <>
      <div className="bg-[#f7f7f7] min-h-screen pt-24">
        <div>
          {/* Fil d'ariane */}
          <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-2">
            <nav className="flex items-center space-x-2 text-sm text-anthracite/60">
              {breadcrumbItems.map((item, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  {item.href ? (
                    <Link href={item.href} className="hover:text-sauge transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-anthracite font-medium">{item.label}</span>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Header compact avec stats */}
          <div className="px-4 sm:px-6 lg:px-8 pb-4 py-6 md:py-8">
            {/* Bandeau informatif si recherche à 30km (pas dans la ville exacte) */}
            {useRadiusSearch && !useRegionSearch && practitioners.length > 0 && (
              <div className="mb-4 bg-sauge/10 border border-sauge/30 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-sauge" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-anthracite mb-1">
                      Aucun praticien à {formattedCity} même, voici les experts les plus proches à moins de 30km.
                    </p>
                    <p className="text-xs text-anthracite/70">
                      💡 Certains praticiens proposent des consultations vidéo pour supprimer la barrière de la distance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bandeau informatif si recherche régionale */}
            {useRegionSearch && regionName && practitioners.length > 0 && (
              <div className="mb-4 bg-sauge/10 border border-sauge/30 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-sauge" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-anthracite mb-1">
                      Pas de spécialiste à {formattedCity}, voici les experts les plus proches dans votre région ({regionName}).
                    </p>
                    <p className="text-xs text-anthracite/70">
                      💡 Certains praticiens proposent des consultations vidéo pour supprimer la barrière de la distance.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white border border-sable/60 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                {/* Titre à gauche */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const IconComponent = getIcon(subject.icon);
                      return <IconComponent className="h-6 w-6 text-[#9bb49b]" strokeWidth={1.5} />;
                    })()}
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold font-heading text-anthracite">
                      {subject.name} {useRegionSearch ? 'dans votre région' : useRadiusSearch ? 'autour de' : 'à'} {formattedCity}
                    </h1>
                  </div>
                </div>

                {/* Stats à droite */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-anthracite">{totalPractitioners}</div>
                    <div className="text-anthracite/60">praticiens spécialisés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-anthracite flex items-center gap-1 justify-center">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      {averageRating.toFixed(1).replace('.', ',')}
                    </div>
                    <div className="text-anthracite/60">note moyenne</div>
                  </div>
                </div>
              </div>

              {/* Conseil IA spécifique au sujet */}
              <div className="mt-4 pt-4 border-t border-sable/30">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-[#9bb49b] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-anthracite/70 leading-relaxed">
                    {getSubjectAdvice(subject.slug)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content scrollable avec carte - Layout naturel avec sticky */}
          <div className="grid grid-cols-1 md:grid-cols-[45%_55%] gap-0">
            {/* Liste des praticiens à gauche (45%) - Scrollable naturellement */}
            <div className="border-r-0 md:border-r border-sable order-1 md:order-1 bg-white">
              {practitioners.length > 0 ? (
                <>
                  {/* Titre de la liste */}
                  <div className="p-6 pb-4 border-b border-sable bg-white sticky top-0 z-10">
                    <h2 className="text-lg md:text-xl font-bold font-heading text-anthracite mb-1">
                      Sélectionnez un praticien
                    </h2>
                    <p className="text-sm md:text-base text-anthracite/70">
                      {pagination?.total || practitioners.length} praticien(s) trouvé(s) {useRegionSearch ? 'dans votre région' : useRadiusSearch ? 'autour de' : 'à'} {formattedCity} • {useRegionSearch || useRadiusSearch ? 'Triés par distance' : 'Triés par pertinence'}
                    </p>
                  </div>

                  {/* Liste des praticiens */}
                  <div>
                    {practitioners.map((practitioner) => {
                      const minServicePrice = practitioner.services.length > 0
                        ? Math.min(...practitioner.services.map((s: any) => s.price_cents))
                        : null;

                      return (
                        <div
                          key={practitioner.id}
                          id={`practitioner-${practitioner.id}`}
                          className={`flex flex-col md:flex-row border-b border-sable ${
                            selectedPractitionerId === practitioner.id ? "bg-sauge/5" : ""
                          }`}
                        >
                          {/* Image à gauche (30-35%) */}
                          <div className="w-full md:w-[32%] flex-shrink-0 relative self-stretch">
                            {practitioner.photo_url ? (
                              <Image
                                src={practitioner.photo_url}
                                alt={practitioner.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 32vw"
                                unoptimized
                              />
                            ) : (
                              <div className="absolute inset-0 w-full h-full bg-[#9bb49b]/10 flex items-center justify-center">
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

                          {/* Contenu à droite */}
                          <div className="flex-1 p-4 md:p-6 relative">
                            {/* Badge profil certifié (uniquement si non réclamé et 0 avis) */}
                            {!practitioner.is_claimed && (practitioner._count?.reviews || 0) === 0 && (
                              <div className="absolute top-4 right-4 md:top-6 md:right-6">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-2xl bg-[#9bb49b]/10 text-[#9bb49b] text-xs font-medium border border-[#9bb49b]/30">
                                  🛡️ Profil certifié (Données publiques)
                                </span>
                              </div>
                            )}

                            {/* Nom du praticien */}
                            <Link
                              href={`/praticien/${practitioner.slug}`}
                              className="hover:text-sauge transition-colors"
                            >
                              <h3 className="text-lg md:text-xl font-bold font-heading text-anthracite mb-2 hover:underline">
                                {practitioner.title}
                              </h3>
                            </Link>

                            {/* Adresse */}
                            <div className="flex items-center gap-1 text-xs md:text-sm text-anthracite/70 mb-3">
                              <MapPin className="h-3 w-3 md:h-4 md:w-4 text-anthracite/60" />
                              <span>
                                {(() => {
                                  // Éviter la redondance si la ville est déjà dans l'adresse
                                  const address = practitioner.address || '';
                                  const city = practitioner.location_city || '';
                                  // Si l'adresse se termine déjà par la ville, ne pas la répéter
                                  if (address && city && address.trim().toLowerCase().endsWith(city.toLowerCase())) {
                                    return address;
                                  }
                                  // Sinon, afficher l'adresse et la ville
                                  return address ? `${address}, ${city}` : city;
                                })()}
                              </span>
                            </div>

                            {/* Avis + Prix — masquer les étoiles si non réclamé ET 0 avis */}
                            {(!practitioner.is_claimed && (practitioner._count?.reviews || 0) === 0) ? null : (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-xs md:text-sm font-semibold text-anthracite">
                                    {practitioner.rating_avg?.toFixed(1).replace(".", ",") || "0,0"} ({(practitioner._count?.reviews || 0)} avis)
                                  </span>
                                </div>
                                {minServicePrice && !isNaN(minServicePrice) && (
                                  <span className="text-xs md:text-sm font-semibold text-anthracite">
                                    À partir de {formatPrice(minServicePrice).replace(".", ",")} €
                                  </span>
                                )}
                              </div>
                            )}
                            {(!practitioner.is_claimed && (practitioner._count?.reviews || 0) === 0) && minServicePrice && !isNaN(minServicePrice) && (
                              <div className="mb-4">
                                <span className="text-xs md:text-sm font-semibold text-anthracite">
                                  À partir de {formatPrice(minServicePrice).replace(".", ",")} €
                                </span>
                              </div>
                            )}

                            {/* Consultation vidéo si disponible */}
                            {(() => {
                              const videoService = practitioner.services?.find((s: any) => s.location_type === "VIDEO_ONLY" || s.location_type === "HYBRID");
                              if (videoService) {
                                return (
                                  <div className="mb-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sauge/10 border border-sauge/30 rounded-2xl">
                                      <svg className="w-4 h-4 text-sauge" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                      <span className="text-xs font-medium text-sauge">Consultation vidéo disponible</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Calendrier simplifié ou placeholder si non réclamé */}
                            <div className="mb-4">
                              {practitioner.is_claimed ? (
                                <SimpleAvailability
                                  practitionerId={practitioner.id}
                                  serviceId={practitioner.services?.find((s: any) => s.is_video === true)?.id || practitioner.services[0]?.id || null}
                                />
                              ) : (
                                <div className="rounded-xl p-4 bg-[#9bb49b]/5 border border-[#9bb49b]/20 text-center">
                                  <p className="text-sm text-anthracite/70">
                                    La prise de rendez-vous en ligne n&apos;est pas encore activée pour ce praticien.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Boutons ou lien selon réclamation */}
                            {practitioner.is_claimed ? (
                              <Link
                                href={`/praticien/${practitioner.slug}`}
                                className="text-xs md:text-sm text-sauge hover:underline"
                              >
                                Plus d'informations
                              </Link>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <Button asChild size="sm" className="bg-[#9bb49b] hover:bg-[#8aa483] text-white">
                                  <Link href={`/praticien/${practitioner.slug}`}>Voir la fiche</Link>
                                </Button>
                                {session?.user ? (
                                  <span
                                    className="inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-medium bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-200"
                                    aria-disabled="true"
                                  >
                                    Réclamez ce profil (réservé aux visiteurs non connectés)
                                  </span>
                                ) : (
                                  <Button asChild variant="outline" size="sm" className="border-sauge/50 text-sauge hover:bg-sauge/5">
                                    <Link href={`/inscription?claim=${practitioner.id}`}>C&apos;est vous ? Réclamez ce profil</Link>
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination - Juste après la liste des praticiens */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="px-4 sm:px-6 lg:px-8 py-6 border-t border-sable bg-white">
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (pagination.hasPreviousPage) {
                              setPage(pagination.page - 1);
                            }
                          }}
                          disabled={!pagination.hasPreviousPage}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Précédent
                        </Button>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (pagination.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                              pageNum = i + 1;
                            } else if (pagination.page >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i;
                            } else {
                              pageNum = pagination.page - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === pagination.page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (pagination.hasNextPage) {
                              setPage(pagination.page + 1);
                            }
                          }}
                          disabled={!pagination.hasNextPage}
                        >
                          Suivant
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>

                      {/* Results count */}
                      <div className="mt-4 text-center text-sm text-anthracite/60">
                        Affichage de {practitioners.length} sur {pagination.total} praticiens
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Carte à droite (55%) - Sticky fixe */}
            <div className="h-[400px] md:sticky md:top-28 md:h-[calc(100vh-8rem)] order-2 md:order-2" style={{ pointerEvents: "auto", zIndex: 10 }}>
              <SubjectMap
                key={`map-${subject.id}-${formattedCity}-${useRadiusSearch}`}
                selectedPractitionerId={selectedPractitionerId}
                onPractitionerSelect={setSelectedPractitionerId}
                searchCity={formattedCity}
                subjectId={subject.id}
                cityZoom={12}
                initialCenter={cityCoords || null}
                useRadiusSearch={useRadiusSearch}
                onMapReady={(flyToFn) => {
                  mapFlyToRef.current = flyToFn;
                }}
              />
            </div>
          </div>

          {/* Section FAQ SEO - En dessous dans une nouvelle section */}
          {practitioners.length > 0 && (
            <div className="px-4 sm:px-6 lg:px-8 py-12 bg-white border-t border-sable/30">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold font-heading text-anthracite mb-6">
                  Questions fréquentes sur le/la {subject.name.toLowerCase()} {useRegionSearch ? 'dans votre région' : useRadiusSearch ? 'autour de' : 'à'} {formattedCity}
                </h2>
                
                {/* FAQ Accordion */}
                <div className="mb-8">
                  <FAQAccordion items={getFAQContent(subject.slug, formattedCity)} />
                </div>

                {/* Paragraphe avec citation des praticiens */}
                {(() => {
                  const topPractitioners = getTopPractitioners();
                  if (topPractitioners.length > 0) {
                    let practitionerText = '';
                    if (topPractitioners.length === 1) {
                      practitionerText = topPractitioners[0];
                    } else if (topPractitioners.length === 2) {
                      practitionerText = `${topPractitioners[0]} et ${topPractitioners[1]}`;
                    } else {
                      practitionerText = `${topPractitioners[0]}, ${topPractitioners[1]} et ${topPractitioners[2]}`;
                    }
                    
                    return (
                      <div className="mt-8 p-6 bg-sauge/5 rounded-2xl border border-sauge/20">
                        <p className="text-anthracite/80 leading-relaxed">
                          <strong className="text-anthracite">Holia recommande notamment {practitionerText}</strong> pour leur expertise {useRadiusSearch ? 'autour de' : 'à'} {formattedCity}. 
                          Ces praticiens vérifiés ont reçu d'excellents retours de leurs patients et sont spécialisés dans l'accompagnement de {subject.name.toLowerCase()}.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}