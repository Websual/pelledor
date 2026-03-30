import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import Link from "next/link";
import {
  Search,
  Heart,
  Users,
  Star,
  Leaf,
  Sparkles,
  Check,
  ShieldCheck,
  Lock,
  MessageSquare,
  Eye,
  Waves,
  Brain,
  Bone,
  Hand,
  Activity,
  Target,
  Flower,
  Moon,
  Shield,
} from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import { HeroSection } from "@/components/hero-section";
import { ProfessionSlider } from "@/components/profession-slider";
import { BesoinCards } from "@/components/besoin-cards";
import { UpcomingEventsSection } from "@/components/upcoming-events-section";
import { ReadMore } from "@/components/read-more";
import { FAQAccordion } from "@/components/faq-accordion";
import { BlogSection } from "@/components/blog-section";
import { TeasingProSection } from "@/components/teasing-pro-section";
import { WhyChooseCards } from "@/components/why-choose-cards";
import { getLatestPosts } from "@/lib/blog";
import subjectsData from "@/data/subjects-symptoms.json";

export const metadata: Metadata = {
  title: "Holia | Bien-être Local & Holistique | Praticiens Certifiés",
  description:
    "Découvrez Holia, la plateforme pour réserver vos soins bien-être holistiques locaux. Praticiens certifiés spécialisés en massages, sophrologie, naturopathie, yoga, médecine alternative et énergétique.",
  keywords: [
    "bien-être holistique",
    "plateforme bien-être local",
    "réserver soin bien-être proche de moi",
    "annuaire praticiens bien-être France",
    "trouver praticien bien-être",
    "ateliers bien-être près de chez moi",
    "visibilité praticien bien-être",
    "logiciel gestion rendez-vous praticien",
    "agenda en ligne coach bien-être",
    "praticien sophrologue",
    "massage relaxant",
    "yoga en plein air",
    "naturopathie",
    "hypnose",
    "reiki",
    "orthokinésiologie",
    "énergéticien",
    "médecine alternative",
    "slow life bien-être",
    "équilibre corps esprit",
  ],
  openGraph: {
    title: "Holia | Bien-être Local & Holistique",
    description:
      "Connectez-vous à une communauté bien-être authentique. Holia vous met en relation avec praticiens certifiés spécialisés en bien-être holistique.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function HomePage() {
  return (
    <>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Holia",
            description:
              "Plateforme de bien-être local et holistique pour praticiens certifiés",
            url: process.env.NEXT_PUBLIC_APP_URL || "https://holia.me",
            logo: `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}/logo-h-green.webp`,
            sameAs: [
              // Add social media links when available
            ],
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer service",
              availableLanguage: ["French"],
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Holia",
            url: process.env.NEXT_PUBLIC_APP_URL || "https://holia.me",
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"}/recherche?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Qu'est-ce que Holia ?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Holia est une plateforme de bien-être local et holistique qui met en relation les patients avec des praticiens certifiés près de chez eux, avec une approche éthique et locale.",
                },
              },
              {
                "@type": "Question",
                name: "Comment prendre rendez-vous ?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Utilisez la recherche (ville, spécialité, disponibilité), choisissez un praticien, puis cliquez sur Réserver et sélectionnez un créneau. Vous recevez une confirmation par email.",
                },
              },
              {
                "@type": "Question",
                name: "Est-ce que le service est payant pour les patients ?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Non. L'accès à Holia, la recherche et la prise de rendez-vous sont 100% gratuits pour les patients. Vous ne payez que la séance chez le praticien.",
                },
              },
              {
                "@type": "Question",
                name: "Comment sont sélectionnés les praticiens ?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Nous vérifions l'identité et l'activité des professionnels (données INSEE, justificatifs). Chaque praticien doit fournir ses certifications et respecter notre charte éthique.",
                },
              },
              {
                "@type": "Question",
                name: "Je suis praticien, comment apparaître sur Holia ?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Inscrivez-vous sur la page Découvrir la solution Pro (holia.me/pro). L'équipe valide votre inscription sous 48h après vérification de vos justificatifs.",
                },
              },
            ],
          }),
        }}
      />

      <main className="bg-white">
        {/* Hero Section */}
        <HeroSection />

        {/* Parcourir par Besoin Section (Solutions) */}
        <section className="py-16 bg-white">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-anthracite mb-4">
                Trouvez des solutions adaptées à vos besoins
              </h2>
              <p className="text-lg text-anthracite/70 max-w-3xl mx-auto">
                Explorez nos praticiens par problématique. Chaque besoin a sa solution naturelle et personnalisée.
              </p>
            </div>

            <BesoinCards />

            <div className="text-center mt-8">
              <Button asChild variant="saugeFill">
                <Link href="/recherche">
                  <span className="relative z-10 flex items-center gap-2">
                    <Search className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.5} />
                    Recherche avancée par ville
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Trouver Votre Soin Section */}
        <section className="py-20 bg-[#f7f7f7] overflow-hidden">
          <div className="w-full">
            <div className="text-center mb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-6">
                Découvrez nos Professionnels
              </h2>
            </div>

            {/* Category Slider - Full Width */}
            <ProfessionSlider
              professions={[
                {
                  id: "naturopathe",
                  title: "Naturopathe",
                  iconName: "Leaf",
                  description:
                    "Approche naturelle de la santé par la phytothérapie, l'alimentation et les techniques de bien-être. Retrouvez l'équilibre de votre organisme.",
                  seoText:
                    "Découvrez nos naturopathes certifiés qui vous accompagnent vers une santé optimale grâce à des méthodes naturelles. La naturopathie combine phytothérapie, nutrition, aromathérapie et techniques de relaxation pour rééquilibrer votre organisme. Bénéficiez de consultations personnalisées, de conseils en alimentation saine et de protocoles naturels adaptés à vos besoins spécifiques. Réservez votre consultation avec un praticien près de chez vous.",
                  images: [
                    "/images/professions/naturopathe-1.webp",
                    "/images/professions/naturopathe-2.webp",
                  ],
                  imageAlts: [
                    "Herbes séchées et huiles essentielles pour consultation de naturopathie et phytothérapie",
                    "Mains de praticien écrivant sur un carnet, consultation personnalisée en naturopathie",
                  ],
                  link: "/profession/naturopathe",
                },
                {
                  id: "sophrologue",
                  title: "Sophrologue",
                  iconName: "Waves",
                  description:
                    "Techniques de relaxation et de gestion du stress pour retrouver sérénité et équilibre émotionnel. Séances adaptées à vos objectifs.",
                  seoText:
                    "Accédez à des séances de sophrologie avec nos praticiens certifiés. Cette méthode douce vous aide à gérer le stress, améliorer votre sommeil, développer votre confiance en vous et mieux vivre vos émotions. La sophrologie combine relaxation, respiration et visualisation positive pour vous accompagner vers un mieux-être durable. Trouvez un sophrologue près de chez vous et commencez votre parcours de développement personnel.",
                  images: [
                    "/images/professions/sophrologue-1.webp",
                    "/images/professions/sophrologue-2.webp",
                  ],
                  imageAlts: [
                    "Pierres zen et lavande pour séance de sophrologie et gestion du stress",
                    "Personne en méditation dans une pièce baignée de lumière, séance de sophrologie",
                  ],
                  link: "/profession/sophrologue",
                },
                {
                  id: "hypnotherapeute",
                  title: "Hypnothérapeute",
                  iconName: "Brain",
                  description:
                    "Accompagnement thérapeutique par l'hypnose pour surmonter vos blocages, changer vos habitudes et atteindre vos objectifs.",
                  seoText:
                    "Explorez les bienfaits de l'hypnose thérapeutique avec nos hypnothérapeutes qualifiés. L'hypnose vous aide à surmonter les addictions, gérer les phobies, réduire l'anxiété et améliorer votre confiance en vous. Cette technique douce et respectueuse vous permet d'accéder à vos ressources inconscientes pour créer des changements positifs durables. Réservez une séance d'hypnose avec un praticien certifié près de chez vous.",
                  images: [
                    "/images/professions/hypnotherapeute-1.webp",
                    "/images/professions/hypnotherapeute-2.webp",
                  ],
                  imageAlts: [
                    "Pendule en laiton sur coussin de velours, cabinet d'hypnothérapie pour le bien-être",
                    "Fauteuil de thérapie confortable avec éclairage doux, séance d'hypnose",
                  ],
                  link: "/profession/hypnotherapeute",
                },
                {
                  id: "osteopathe",
                  title: "Ostéopathe",
                  iconName: "Bone",
                  description:
                    "Soins ostéopathiques doux pour soulager les douleurs, améliorer la mobilité et rétablir l'équilibre de votre corps.",
                  seoText:
                    "Consultez nos ostéopathes diplômés pour des soins manuels adaptés à vos besoins. L'ostéopathie traite les troubles musculo-squelettiques, les maux de dos, les migraines et les troubles digestifs par des techniques douces et non invasives. Cette approche globale considère votre corps dans son ensemble pour identifier et traiter la cause de vos douleurs. Réservez votre consultation ostéopathique avec un praticien près de chez vous.",
                  images: [
                    "/images/professions/osteopathe-1.webp",
                    "/images/professions/osteopathe-2.webp",
                  ],
                  imageAlts: [
                    "Mains effectuant un ajustement doux sur une nuque, séance d'ostéopathie thérapeutique",
                    "Modèle de colonne vertébrale en bois sur bureau minimaliste, consultation ostéopathique",
                  ],
                  link: "/profession/osteopathe",
                },
                {
                  id: "reflexologue",
                  title: "Réflexologue",
                  iconName: "Hand",
                  description:
                    "Réflexologie plantaire et palmaire pour stimuler les points réflexes, favoriser la détente et rééquilibrer votre organisme.",
                  seoText:
                    "Découvrez les bienfaits de la réflexologie avec nos praticiens certifiés. Cette technique de massage des pieds et des mains stimule les zones réflexes correspondant aux différents organes et systèmes du corps. La réflexologie favorise la relaxation profonde, améliore la circulation sanguine et lymphatique, et aide à rééquilibrer votre organisme. Réservez une séance de réflexologie plantaire avec un praticien près de chez vous.",
                  images: [
                    "/images/professions/reflexologue-1.webp",
                    "/images/professions/reflexologue-2.webp",
                  ],
                  imageAlts: [
                    "Pieds reposant sur serviette douce avec focus sur les points d'acupression, réflexologie plantaire pour détente profonde",
                    "Diffuseur d'huiles essentielles avec vapeur subtile dans environnement spa moderne, séance de réflexologie",
                  ],
                  link: "/profession/reflexologue",
                },
                {
                  id: "kinesitherapeute",
                  title: "Kinésithérapeute",
                  iconName: "Activity",
                  description:
                    "Rééducation fonctionnelle, réadaptation et prévention des blessures. Accompagnement personnalisé pour retrouver votre mobilité.",
                  seoText:
                    "Consultez nos kinésithérapeutes diplômés pour votre rééducation et votre bien-être. La kinésithérapie vous aide à récupérer après une blessure, une opération ou un accident. Nos praticiens utilisent des techniques de massage, de mobilisation, d'exercices thérapeutiques et de physiothérapie pour restaurer votre fonction motrice et réduire la douleur. Réservez votre séance de kinésithérapie avec un praticien près de chez vous.",
                  images: [
                    "/images/professions/kinesitherapeute-1.webp",
                    "/images/professions/kinesitherapeute-2.webp",
                  ],
                  imageAlts: [
                    "Bandes de résistance professionnelles et bloc de yoga en liège sur sol en bois clair, rééducation et kinésithérapie fonctionnelle",
                    "Praticien guidant un mouvement avec focus doux sur l'articulation, séance de rééducation",
                  ],
                  link: "/profession/kinesitherapeute",
                },
                {
                  id: "psychologue",
                  title: "Psychologue",
                  iconName: "Heart",
                  description:
                    "Accompagnement psychologique et soutien émotionnel pour traverser les difficultés de la vie et développer votre bien-être mental.",
                  seoText:
                    "Trouvez un psychologue qualifié pour vous accompagner dans votre parcours de développement personnel. La psychologie vous aide à mieux comprendre vos émotions, gérer le stress, surmonter les traumatismes et améliorer vos relations. Nos psychologues utilisent différentes approches thérapeutiques adaptées à vos besoins : TCC, psychanalyse, thérapie systémique. Réservez votre consultation psychologique avec un praticien près de chez vous.",
                  images: [
                    "/images/professions/psychologue-1.webp",
                    "/images/professions/psychologue-2.webp",
                  ],
                  imageAlts: [
                    "Deux tasses en céramique avec thé fumant sur table basse en bois, consultation psychologique et soutien émotionnel",
                    "Vue sur jardin paisible depuis grande fenêtre avec végétation intérieure floutée, cabinet de psychologie",
                  ],
                  link: "/profession/psychologue",
                },
                {
                  id: "coach-bien-etre",
                  title: "Coach Bien-être",
                  iconName: "Target",
                  description:
                    "Accompagnement personnalisé pour définir vos objectifs, développer votre potentiel et créer la vie qui vous correspond.",
                  seoText:
                    "Découvrez nos coaches bien-être certifiés pour vous accompagner dans votre développement personnel et professionnel. Le coaching vous aide à clarifier vos objectifs, surmonter vos blocages, améliorer votre confiance en vous et créer des changements positifs dans votre vie. Nos coaches utilisent des outils et techniques adaptés à vos besoins spécifiques. Réservez votre séance de coaching avec un praticien près de chez vous.",
                  images: [
                    "/images/professions/coach-bien-etre-1.webp",
                    "/images/professions/coach-bien-etre-2.webp",
                  ],
                  imageAlts: [
                    "Journal en lin ouvert avec stylo élégant et feuille verte, coaching professionnel en développement personnel",
                    "Espace de travail lumineux avec ordinateur affichant un planning épuré, séance de coaching bien-être",
                  ],
                  link: "/profession/coach-bien-etre",
                },
                {
                  id: "acupuncteur",
                  title: "Acupuncteur",
                  iconName: "Sparkles",
                  description:
                    "Soins d'acupuncture et médecine traditionnelle chinoise pour rééquilibrer votre énergie et traiter divers troubles de santé.",
                  seoText:
                    "Consultez nos acupuncteurs diplômés en médecine traditionnelle chinoise. L'acupuncture stimule les points d'énergie de votre corps pour rééquilibrer le flux énergétique et traiter de nombreux troubles : douleurs, stress, troubles digestifs, allergies, insomnies. Cette médecine millénaire considère votre corps dans sa globalité pour restaurer votre équilibre naturel. Réservez votre séance d'acupuncture avec un praticien près de chez vous.",
                  images: [
                    "/images/professions/acupuncteur-1.webp",
                    "/images/professions/acupuncteur-2.webp",
                  ],
                  imageAlts: [
                    "Aiguilles d'acupuncture fines dans bol en porcelaine, esthétique traditionnelle, soins d'acupuncture et médecine chinoise",
                    "Praticien plaçant une aiguille en macro, éclairage serein, séance d'acupuncture",
                  ],
                  link: "/profession/acupuncteur",
                },
                {
                  id: "magnetiseur",
                  title: "Magnétiseur",
                  iconName: "Flower",
                  description:
                    "Soins énergétiques par magnétisme curatif pour réharmoniser votre corps et favoriser votre processus d'auto-guérison.",
                  seoText:
                    "Découvrez les soins de magnétisme avec nos praticiens certifiés. Le magnétisme curatif utilise l'énergie naturelle pour rééquilibrer votre organisme, soulager les douleurs, réduire l'inflammation et favoriser la guérison. Cette technique douce et non invasive complète les soins médicaux traditionnels. Nos magnétiseurs vous accompagnent dans votre processus de bien-être et de réharmonisation énergétique. Réservez votre séance avec un praticien près de chez vous.",
                  images: [
                    "/images/professions/magnetiseur-1.webp",
                    "/images/professions/magnetiseur-2.webp",
                  ],
                  imageAlts: [
                    "Mains écartées avec lumière naturelle entre elles, soins énergétiques et magnétisme curatif",
                    "Cristaux de quartz transparents sur tissu vert sauge, séance de magnétisme",
                  ],
                  link: "/profession/magnetiseur",
                },
                {
                  id: "praticien-reiki",
                  title: "Praticien Reiki",
                  iconName: "Moon",
                  description:
                    "Séances de Reiki et harmonisation énergétique pour restaurer votre équilibre, réduire le stress et favoriser la détente profonde.",
                  seoText:
                    "Expérimentez les bienfaits du Reiki avec nos praticiens certifiés. Le Reiki est une technique de soin énergétique japonaise qui canalise l'énergie universelle pour rééquilibrer vos chakras et favoriser votre bien-être. Les séances de Reiki vous aident à réduire le stress, améliorer votre sommeil, soulager les douleurs et retrouver votre équilibre émotionnel. Réservez votre séance de Reiki avec un praticien près de chez vous.",
                  images: [
                    "/images/professions/praticien-reiki-1.webp",
                    "/images/professions/praticien-reiki-2.webp",
                  ],
                  imageAlts: [
                    "Mains floutées au-dessus d'un corps avec atmosphère d'énergie de guérison chaude, séance de Reiki et harmonisation énergétique",
                    "Bol chantant en laiton avec maillet en bois sur tissu en lin, séance de Reiki",
                  ],
                  link: "/profession/praticien-reiki",
                },
                {
                  id: "therapeute",
                  title: "Thérapeute",
                  iconName: "Shield",
                  description:
                    "Approche holistique et globale du bien-être pour vous accompagner dans votre parcours de santé et de développement personnel.",
                  seoText:
                    "Trouvez un thérapeute holistique pour vous accompagner dans votre bien-être global. La thérapie holistique considère votre corps, votre esprit et vos émotions comme un tout indissociable. Nos thérapeutes utilisent différentes techniques adaptées à vos besoins : thérapie manuelle, énergétique, psychocorporelle. Cette approche globale vous aide à retrouver votre équilibre et à développer votre potentiel de guérison. Réservez votre consultation avec un thérapeute près de chez vous.",
                  images: [
                    "/images/professions/therapeute-1.webp",
                    "/images/professions/therapeute-2.webp",
                  ],
                  imageAlts: [
                    "Bol en céramique rempli d'eau claire avec fleur flottante, thérapie holistique et approche globale du corps",
                    "Composition minimaliste abstraite de lumière et d'ombre sur mur, séance de thérapie",
                  ],
                  link: "/profession/therapeute",
                },
              ]}
              autoSlideInterval={5000}
            />
          </div>

        </section>

        {/* Les prochains événements bien-être */}
        <UpcomingEventsSection />

        {/* Comment ça marche Section – Contained Card Layout */}
        <section className="py-16 md:py-20 bg-[#f7f7f7] overflow-hidden">
          <div className="mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-anthracite shadow-xl shadow-black/10 overflow-hidden p-8 md:p-12 lg:p-16">
              <h2 className="text-4xl md:text-5xl font-bold font-heading text-white mb-12 text-center">
                Comment ça marche ?
              </h2>

              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {[
                  {
                    step: "1",
                    title: "Recherchez",
                    description:
                      "Utilisez notre moteur de recherche pour trouver des praticiens près de chez vous. Filtrez par ville, spécialité, note, tarif ou disponibilité.",
                  },
                  {
                    step: "2",
                    title: "Découvrez",
                    description:
                      "Consultez les profils détaillés, les avis clients, les services proposés et les tarifs. Chaque praticien est vérifié et certifié dans son domaine.",
                  },
                  {
                    step: "3",
                    title: "Réservez",
                    description:
                      "Réservez votre rendez-vous en quelques clics. Confirmation immédiate et rappel par email.",
                  },
                ].map((step, index) => (
                  <div key={index} className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sauge text-white text-2xl font-bold mb-6">
                      {step.step}
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-white mb-4">
                      {step.title}
                    </h3>
                    <p className="text-white/70">{step.description}</p>
                  </div>
                ))}
              </div>

              {/* Text with ReadMore */}
              <div className="text-white">
                <ReadMore>
                  <p className="text-white/90 leading-relaxed">
                    Holia simplifie votre recherche de bien-être local en trois
                    étapes simples. Que vous soyez à la recherche d'un praticien
                    sophrologue à Pau, d'un atelier de méditation à Bordeaux, ou
                    d'un masseur bien-être à Lyon, notre plateforme vous guide
                    vers les meilleures expériences locales. Notre moteur de recherche
                    vous permet de filtrer par ville, spécialité, note, tarif ou
                    disponibilité, pour trouver rapidement le praticien qui correspond à
                    vos besoins. Chaque profil est détaillé avec des avis clients
                    authentiques, des informations sur les services proposés, les
                    tarifs, et les disponibilités. Une fois que vous avez trouvé le
                    praticien idéal, la réservation se fait en quelques clics, avec
                    confirmation immédiate et rappel par email.
                  </p>
                </ReadMore>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="bg-white py-16 lg:py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Title outside white container */}
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-8 text-center lg:text-left">
              Pourquoi choisir Holia pour votre bien-être ?
            </h2>

            {/* Bento cards – design moderne avec spotlight et animations */}
            <div className="my-12 md:my-16">
              <WhyChooseCards />
            </div>

            {/* Text below with ReadMore */}
            <div className="mt-8">
              <ReadMore>
                <p className="text-anthracite/70 leading-relaxed">
                  Holia se distingue des autres plateformes de bien-être par son
                  approche authentique et locale. Nous croyons que le bien-être
                  commence par la connexion à soi, aux autres et à la nature. C'est
                  pourquoi nous privilégions les praticiens indépendants qui partagent
                  nos valeurs d'authenticité, de bienveillance et de respect du
                  vivant. Notre plateforme vous permet de découvrir des expériences de
                  bien-être uniques, près de chez vous, tout en soutenant une économie
                  locale et responsable. Que vous recherchiez un praticien sophrologue à
                  Pau, un atelier de méditation à Bordeaux, ou un masseur bien-être à
                  Lyon, Holia vous connecte aux meilleurs professionnels du bien-être
                  local. Notre sélection rigoureuse de praticiens certifiés garantit une
                  expérience de qualité, tandis que notre outil de recherche avancé vous
                  permet de trouver rapidement le professionnel qui correspond à vos
                  besoins et à vos valeurs. Chaque praticien sur Holia partage notre
                  vision d'un bien-être holistique, authentique et respectueux du
                  vivant, vous garantissant ainsi une expérience enrichissante et mémorable.
                </p>
              </ReadMore>
            </div>
          </div>
        </section>

        {/* Arrondi sauge : courbe entre section grise et Teasing Pro (séparateur visible) */}
        <div className="w-full shrink-0" role="presentation" aria-hidden>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="w-full block"
            style={{ height: "clamp(4rem, 8vw, 9rem)" }}
          >
            <path
              fill="#9bb49b"
              d="M0,120 L0,0 Q360,80 720,40 Q1080,0 1440,40 L1440,120 Z"
            />
          </svg>
        </div>

        {/* Teasing Pro – design Awwwards premium */}
        <TeasingProSection />

        {/* Conseils & Actualités – 3 derniers articles */}
        <BlogSection
          title="Conseils & Actualités"
          posts={getLatestPosts(3)}
          linkUrl="/blog"
          linkLabel="Voir tout le blog"
        />

        {/* Témoignages Section */}
        <section className="py-20 bg-white overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-6">
                  Témoignages de nos utilisateurs et partenaires
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {[
                  {
                    name: "Marie L.",
                    role: "Cliente",
                    location: "Pau",
                    comment:
                      "J'ai trouvé une sophrologue exceptionnelle grâce à Holia. La plateforme est intuitive et les praticiens sont vraiment de qualité. Je recommande !",
                    rating: 5,
                  },
                  {
                    name: "Sophie M.",
                    role: "Praticienne",
                    location: "Bordeaux",
                    comment:
                      "Holia m'a permis de développer ma clientèle de manière significative. L'outil de gestion est complet et la visibilité locale est optimale.",
                    rating: 5,
                  },
                  {
                    name: "Claire R.",
                    role: "Praticienne",
                    location: "Lyon",
                    comment:
                      "En tant que praticienne en reiki et médecine alternative, Holia me permet de toucher une clientèle engagée et soucieuse de qualité. La gestion des réservations est simple et efficace.",
                    rating: 5,
                  },
                ].map((testimonial, index) => (
                  <Card key={index} className="border-sable/30">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-yellow-500 fill-yellow-500"
                          />
                        ))}
                      </div>
                      <CardTitle className="text-lg font-heading text-anthracite">
                        {testimonial.name}
                      </CardTitle>
                      <p className="text-sm text-anthracite/60">
                        {testimonial.role} - {testimonial.location}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-anthracite/70 italic">
                        "{testimonial.comment}"
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="max-w-3xl mx-auto text-center">
                <ReadMore>
                  <p className="text-lg text-anthracite/70 leading-relaxed">
                    Découvrez ce que disent les membres de la communauté Holia,
                    qu'ils soient clients ou praticiens. Nos utilisateurs
                    partagent leurs expériences et leurs retours sur les praticiens de la
                    plateforme, vous permettant de faire un choix éclairé et de découvrir
                    des professionnels qui correspondent à vos attentes. Que vous soyez à
                    la recherche d'un praticien sophrologue à Pau, d'un atelier de
                    méditation à Bordeaux, ou d'un praticien en médecine alternative à
                    Lyon, les témoignages de nos utilisateurs vous aident à trouver les
                    meilleures expériences locales. Chaque témoignage est authentique et
                    provient de clients ayant réellement utilisé les services, garantissant
                    ainsi la fiabilité et la pertinence des informations partagées.
                  </p>
                </ReadMore>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section – même design que /pro */}
        <section className="py-24 lg:py-32 px-4 bg-[#f7f7f7]" id="faq">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold font-heading text-slate-900 mb-6">
                Questions fréquentes sur Holia
              </h2>
              <div className="max-w-2xl mx-auto">
                <ReadMore>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    Trouvez les réponses aux questions les plus fréquentes sur Holia,
                    notre plateforme de bien-être local et holistique. Que vous soyez
                    client ou praticien, nous répondons à vos interrogations pour
                    utiliser la plateforme en toute confiance : trouver un praticien,
                    réserver une séance, rejoindre Holia en tant que professionnel.
                  </p>
                </ReadMore>
              </div>
            </div>

            <FAQAccordion
              items={[
                {
                  question: "Qu'est-ce que Holia ?",
                  answer:
                    "Holia est une plateforme de bien-être local et holistique qui met en relation les patients avec des praticiens certifiés près de chez eux. Nous privilégions une approche éthique et locale : praticiens indépendants, valeurs d'authenticité, de bienveillance et de respect du vivant. Que vous cherchiez un sophrologue, un naturopathe, un massothérapeute ou un praticien en médecine alternative, Holia vous connecte à une communauté engagée.",
                },
                {
                  question: "Comment prendre rendez-vous ?",
                  answer: (
                    <>
                      Utilisez notre{" "}
                      <Link href="/recherche" className="text-[#9bb49b] font-medium underline underline-offset-2 hover:no-underline">
                        recherche
                      </Link>{" "}
                      (ville, spécialité, disponibilité), choisissez un praticien, puis cliquez sur « Réserver » et sélectionnez un créneau. Vous recevez une confirmation par email. Simple et rapide.
                    </>
                  ),
                },
                {
                  question: "Est-ce que le service est payant pour les patients ?",
                  answer:
                    "Non. L'accès à Holia, la recherche de praticiens et la prise de rendez-vous en ligne sont 100 % gratuits pour les patients. Vous ne payez que la séance chez le praticien, selon ses tarifs indiqués sur son profil.",
                },
                {
                  question: "Comment sont sélectionnés les praticiens ?",
                  answer:
                    "Nous vérifions l'identité et l'activité des professionnels (données INSEE, justificatifs). Chaque praticien doit fournir ses certifications et respecter notre charte éthique. Notre équipe valide chaque profil avant mise en ligne pour garantir qualité et confiance.",
                },
                {
                  question: "Je suis praticien, comment apparaître sur Holia ?",
                  answer: (
                    <>
                      Inscrivez-vous sur la page{" "}
                      <Link href="/pro" className="text-[#9bb49b] font-medium underline underline-offset-2 hover:no-underline">
                        Découvrir la solution Pro
                      </Link>{" "}
                      : vous y trouverez les outils (agenda, visibilité, facturation) et pourrez créer votre profil. L'équipe valide votre inscription sous 48 h après vérification de vos justificatifs.
                    </>
                  ),
                },
              ]}
            />
          </div>
        </section>

        {/* CTA Final Section – Contained Card Layout */}
        <section className="py-16 md:py-20 bg-[#f7f7f7] overflow-hidden">
          <div className="mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-sauge text-white shadow-xl shadow-black/10 overflow-hidden p-8 md:p-12 lg:p-16">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold font-heading">
                  Prêt à découvrir votre bien-être local ?
                </h2>
                <p className="text-xl text-white/90 max-w-2xl mx-auto">
                  Rejoignez la communauté Holia et découvrez les praticiens qui
                  partagent vos valeurs d'authenticité, de bien-être et de respect
                  du vivant. Une communauté engagée pour votre bien-être holistique.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link
                    href="/recherche"
                    className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white px-8 py-4 text-base font-semibold text-sauge transition-colors duration-300 hover:text-sauge-dark"
                  >
                    <span className="absolute inset-0 z-0 h-full w-0 bg-sauge/10 transition-all duration-500 ease-out group-hover:w-full" />
                    <span className="relative z-10 flex items-center gap-2">
                      <Search className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                      Trouver un praticien
                    </span>
                  </Link>
                  <Link
                    href="/pro"
                    className="group relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 border-white px-8 py-4 text-base font-semibold text-white transition-colors duration-300 hover:bg-white/5"
                  >
                    <span className="absolute inset-0 z-0 h-full w-0 bg-white/10 transition-all duration-500 ease-out group-hover:w-full" />
                    <span className="relative z-10 flex items-center gap-2">
                      <Users className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                      Devenir praticien
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
