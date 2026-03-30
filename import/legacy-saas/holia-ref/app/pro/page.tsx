"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button, Card, CardContent } from "@/components/ui";
import { Combobox } from "@/components/ui/combobox";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { BlogSection } from "@/components/blog-section";
import type { BlogSectionPost } from "@/components/blog-section";
import {
  Calendar,
  CreditCard,
  Search,
  BarChart3,
  CheckCircle,
  ArrowRight,
  FileText,
  Shield,
  Leaf,
  Waves,
  Brain,
  Bone,
  Hand,
  Activity,
  Heart,
  Target,
  Sparkles,
  Flower,
  Moon,
  MessageCircle,
  CalendarDays,
  Megaphone,
  Star,
  ChevronDown,
  Plus,
  Minus,
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/** Texte unifié du manifeste — découpé en mots pour l’effet d’illumination au scroll. */
const MANIFEST_TEXT =
  "Holia est né d'une volonté simple : arrêter de transformer les praticiens en produits. Développée avec passion dans le sud-ouest, notre plateforme privilégie l'humain et l'éthique. Pas de faux profils, pas de dépenses sans résultats, pas d'algorithmes opaques, juste des outils puissants pour ceux qui soignent.";
const MANIFEST_WORDS = MANIFEST_TEXT.split(/\s+/);
/** Mots à afficher en vert sauge (#9bb49b) au centre ; le reste en noir (#111827). */
const MANIFEST_SAGE = new Set([
  "Holia",
  "l'humain",
  "l'éthique",
  "outils",
  "puissants",
  "ceux",
  "qui",
  "soignent",
]);

const PRO_FAQ = [
  {
    question: "Est-ce vraiment gratuit ?",
    answer:
      "Oui, l'accès aux outils de gestion (agenda, fiches clients, facturation, visibilité) est gratuit à vie. Nous ne facturons aucun abonnement ni frais fixes. Nous ne nous rémunérons que par une commission sur les nouveaux clients que nous vous apportons via la plateforme.",
  },
  {
    question: "Que se passe-t-il si je veux partir ?",
    answer:
      "Vos données vous appartiennent. Vous pouvez exporter vos fiches clients et votre historique en un clic à tout moment. Aucun engagement : vous restez libre de quitter la plateforme quand vous le souhaitez, sans frais ni blocage.",
  },
  {
    question: "Puis-je garder mon site actuel ?",
    answer:
      "Absolument. Holia est conçu pour s'intégrer à votre présence en ligne existante. Vous gardez votre site et bénéficiez d'un lien DoFollow vers votre profil Holia ainsi que d'un widget de réservation fluide à insérer où vous voulez.",
  },
  {
    question: "Comment fonctionne la commission de 8 % ?",
    answer:
      "La commission s'applique uniquement sur les réservations payées en ligne via Holia. Si un client vous paie en direct au cabinet, par chèque ou virement hors plateforme, c'est 0 %. Un plafond mensuel (59 €) limite l'impact sur votre activité.",
  },
  {
    question: "Comment Holia protège-t-il mes données ?",
    answer:
      "Vos données sont hébergées en Europe et protégées selon le RGPD. Les paiements passent par Stripe (certification PCI-DSS). Nous ne vendons pas vos données et n'utilisons vos informations que pour faire fonctionner la plateforme et vous mettre en relation avec vos clients.",
  },
  {
    question: "Faut-il une formation pour prendre en main Holia ?",
    answer:
      "L'interface est pensée pour être utilisable sans formation. Vous pouvez créer votre profil, configurer vos créneaux et accepter des réservations en quelques minutes. Un pack d'installation optionnel (50 € une fois) permet en plus de déléguer la mise en ligne à notre équipe si vous préférez.",
  },
];

type FeatureBadge = {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  text: string;
  delay?: number;
};

const FEATURES: Array<{
  id: string;
  title: string;
  shortDesc: string;
  description: string;
  image: string;
  imageLeft: boolean;
  icon: typeof Calendar;
  badges?: FeatureBadge[];
}> = [
  {
    id: "agenda",
    title: "Agenda & Réservation 24/7",
    shortDesc: "Vos patients réservent et gèrent leurs RDV seuls.",
    description:
      "Fini les appels pendant vos séances : vos patients réservent, déplacent ou annulent leurs rendez-vous seuls, 24h/24 et 7j/7, depuis votre page Holia ou votre site. Vous gagnez des heures de gestion tout en réduisant les oublis et les no-shows. L'agenda s'adapte à vos créneaux, durées et types de prestations.",
    image: "/images/pro-agenda-reservation.webp",
    imageLeft: true,
    icon: Calendar,
    badges: [
      { position: "top-right", text: "3 RDV confirmés", delay: 1 },
      { position: "bottom-left", text: "+12 réservations cette semaine", delay: 2 },
    ],
  },
  {
    id: "paiement",
    title: "Paiements Sécurisés",
    shortDesc: "Stripe Connect, encaissements et remboursements automatiques.",
    description:
      "Acceptez les paiements en ligne en toute sécurité avec Stripe. Vos clients paient à la réservation ou sur place par carte : vous limitez les impayés et les no-shows. Les encaissements et remboursements sont gérés automatiquement, et vos factures s'éditent en un clic pour une comptabilité sereine.",
    image: "/images/pro-paiement-securise.webp",
    imageLeft: false,
    icon: CreditCard,
    badges: [
      { position: "top-left", text: "SSL Sécurisé", delay: 0.5 },
      { position: "bottom-right", text: "Encaissements cette semaine", delay: 1.5 },
    ],
  },
  {
    id: "visibilite",
    title: "Visibilité Google Premium",
    shortDesc: "Profil optimisé pour apparaître en première page.",
    description:
      "Votre fiche praticien Holia est conçue pour le référencement local : vous augmentez vos chances d'apparaître en première page sur Google quand des patients cherchent un professionnel de votre discipline près de chez eux. Mettez en avant votre parcours, vos spécialités et vos avis pour attirer de nouveaux clients en toute confiance.",
    image: "/images/pro-visibilite-ciblee.webp",
    imageLeft: true,
    icon: Search,
    badges: [
      { position: "top-right", text: "#1 Local", delay: 0.8 },
      { position: "bottom-left", text: "4.8⭐ (127 avis)", delay: 1.2 },
    ],
  },
  {
    id: "facturation",
    title: "Facturation Automatique",
    shortDesc: "Factures générées et envoyées après chaque séance.",
    description:
      "Plus besoin de rédiger vos factures à la main : elles se génèrent et s'envoient automatiquement après chaque rendez-vous. Vos clients les reçoivent par email et vous gardez un historique clair pour votre comptabilité et pour les mutuelles. Un gain de temps et de professionnalisme au quotidien.",
    image: "/images/pro-facturation-automatique.webp",
    imageLeft: false,
    icon: FileText,
    badges: [
      { position: "top-left", text: "Facture #00123", delay: 0.3 },
      { position: "bottom-right", text: "Envoyée automatiquement", delay: 1.8 },
    ],
  },
  {
    id: "messagerie",
    title: "Messagerie Sécurisée",
    shortDesc: "Échanges chiffrés pour protéger la confidentialité.",
    description:
      "Échangez avec vos patients dans un espace dédié et chiffré (AES-256). Les messages restent confidentiels et traçables, conformes aux bonnes pratiques. Idéal pour rappels, questions ou envoi de documents sans passer par des emails non sécurisés.",
    image: "/images/pro-messagerie-securisee.webp",
    imageLeft: true,
    icon: MessageCircle,
    badges: [
      { position: "top-right", text: "Chiffré", delay: 0.6 },
      { position: "bottom-left", text: "3 nouveaux messages", delay: 1 },
    ],
  },
  {
    id: "evenements",
    title: "Ateliers & Événements",
    shortDesc: "Séances collectives et stages, inscriptions automatisées.",
    description:
      "Proposez des ateliers, des stages ou des séances en groupe sans vous compliquer la vie : créez l'événement, fixez le nombre de places et la date. Les inscriptions et les paiements se font en ligne ; vous recevez la liste des participants et pouvez envoyer des rappels. Parfait pour développer votre activité en groupe.",
    image: "/images/pro-evenements.webp",
    imageLeft: false,
    icon: CalendarDays,
    badges: [
      { position: "top-left", text: "12 inscrits", delay: 0.4 },
      { position: "bottom-right", text: "Stage du 15/03", delay: 1.2 },
    ],
  },
  {
    id: "marketing",
    title: "Marketing & Promotions",
    shortDesc: "Offres spéciales et cartes cadeaux, même la nuit.",
    description:
      "Boostez vos périodes creuses avec des offres ciblées (première séance, forfaits, saison). Vendez des cartes cadeaux en ligne : vos clients achètent et réservent quand ils veulent, y compris la nuit. Vous gérez tout depuis votre tableau de bord sans effort supplémentaire.",
    image: "/images/pro-marketing.webp",
    imageLeft: true,
    icon: Megaphone,
    badges: [
      { position: "top-right", text: "Offre du mois", delay: 0.5 },
      { position: "bottom-left", text: "Cartes cadeaux actives", delay: 1.4 },
    ],
  },
  {
    id: "reputation",
    title: "Réputation & Avis",
    shortDesc: "Avis certifiés et mise en valeur sur Google.",
    description:
      "Collectez des avis vérifiés après chaque rendez-vous. Ils renforcent la confiance des futurs patients et améliorent votre visibilité sur Google grâce à une structure de données optimisée pour le SEO. Votre expertise et votre sérieux sont mis en valeur sans fausses notes.",
    image: "/images/pro-avis-reputation.webp",
    imageLeft: false,
    icon: Star,
    badges: [
      { position: "top-left", text: "Avis certifiés", delay: 0.3 },
      { position: "bottom-right", text: "4.9⭐ sur Google", delay: 1 },
    ],
  },
];

function FeatureAccordionCard({
  feature,
  isExpanded,
  onToggle,
}: {
  feature: (typeof FEATURES)[0];
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [24, -12, -12, 24]);
  const Icon = feature.icon;

  return (
    <motion.div
      ref={cardRef}
      layout
      className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-hidden"
      initial={false}
    >
      {/* Header – responsive : mobile = icône+titre alignés, texte dessous, bouton Découvrir dessous */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full rounded-xl text-left hover:bg-gray-50/80 transition-colors p-1 -m-1"
        aria-expanded={isExpanded}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 md:gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <motion.div
              className="w-14 h-14 lg:w-16 lg:h-16 bg-[#9bb49b]/10 rounded-xl flex items-center justify-center flex-shrink-0"
              animate={{ rotate: isExpanded ? 0 : 0 }}
            >
              <Icon className="h-7 w-7 lg:h-8 lg:w-8 text-[#9bb49b]" />
            </motion.div>
            <h3 className="text-xl lg:text-2xl font-bold text-slate-900">{feature.title}</h3>
          </div>
          <p className="text-slate-600 text-sm md:text-base flex-1 min-w-0 md:mt-0">
            {feature.shortDesc}
          </p>
          <span className="text-[#9bb49b] font-semibold flex items-center gap-2 flex-shrink-0 md:ml-auto">
            Découvrir
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="h-5 w-5" />
            </motion.span>
          </span>
        </div>
      </button>

      {/* Contenu extensible – grid 0fr/1fr pour une animation fluide */}
      <div
        className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
      >
        <motion.div
          initial={false}
          animate={{ opacity: isExpanded ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="border-t border-gray-100 pt-8">
            <div className="grid grid-cols-1 gap-8 lg:gap-12 items-center lg:grid-cols-2">
              {/* Texte : gauche si imageLeft, droite sinon (order 2) */}
              <div className={feature.imageLeft ? "lg:order-1" : "lg:order-2"}>
                <p className="text-lg text-slate-600 leading-relaxed">{feature.description}</p>
                <button
                  type="button"
                  className="mt-6 inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full rounded-xl shadow-md bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/inscription?role=practitioner");
                  }}
                >
                  Découvrir Holia
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
              {/* Image avec badges animés */}
              <div className={`relative h-[280px] lg:h-[360px] rounded-xl overflow-hidden ${feature.imageLeft ? "lg:order-2" : "lg:order-1"}`}>
                <motion.div className="absolute inset-0" style={{ y: imageY }}>
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </motion.div>
                {feature.badges?.map((badge, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 6 + (badge.delay ?? 0),
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: badge.delay ?? 0,
                    }}
                    className={`absolute bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg text-sm font-medium text-slate-900 ${
                      badge.position === "top-left" ? "top-3 left-3" :
                      badge.position === "top-right" ? "top-3 right-3" :
                      badge.position === "bottom-left" ? "bottom-3 left-3" :
                      "bottom-3 right-3"
                    }`}
                  >
                    {badge.text}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function ProPage() {
  const router = useRouter();
  const [job, setJob] = useState("");
  const [jobOther, setJobOther] = useState("");
  const [isOtherProfession, setIsOtherProfession] = useState(false);
  const [professions, setProfessions] = useState<Array<{ id: string; name: string }>>([]);
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogSectionPost[]>([]);
  const heroRef = useRef(null);
  const manifestRef = useRef<HTMLElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });

  const { scrollYProgress: manifestScrollProgress } = useScroll({
    target: manifestRef,
    offset: ["start end", "end start"],
  });
  const nWords = MANIFEST_WORDS.length;
  const MANIFEST_BASE = "#f3f4f6";
  const manifestWordColors = MANIFEST_WORDS.map((word, i) => {
    const t = nWords > 1 ? i / (nWords - 1) : 0.5;
    const peak = 0.2 + 0.5 * t;
    const inStart = Math.max(0, peak - 0.05);
    const endColor = MANIFEST_SAGE.has(word) ? "#9bb49b" : "#0f172a";
    return useTransform(
      manifestScrollProgress,
      [inStart, peak, 1],
      [MANIFEST_BASE, endColor, endColor]
    );
  });

  // Charger les professions depuis l'API
  useEffect(() => {
    fetch("/api/professions")
      .then((res) => res.json())
      .then((data) => setProfessions(data))
      .catch((err) => console.error("Error fetching professions:", err));
  }, []);

  // Charger les 3 derniers articles "Conseils Pro"
  useEffect(() => {
    fetch("/api/blog/latest?limit=3&category=Conseils%20Pro")
      .then((res) => res.json())
      .then((data) => setBlogPosts(data.posts ?? []))
      .catch(() => setBlogPosts([]));
  }, []);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const professionToSend = isOtherProfession ? jobOther : job;
    if (professionToSend.trim()) {
      router.push(`/inscription?role=practitioner&job=${encodeURIComponent(professionToSend)}`);
    } else {
      router.push(`/inscription?role=practitioner`);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-20 md:pt-0">
      {/* Hero Section — marge haut gérée par main (mobile uniquement) */}
      <section
        ref={heroRef}
        className="min-h-screen w-full"
      >
        <div className="w-full min-h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
            {/* Left Column - Action (à gauche sur desktop, en haut sur mobile) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="order-1 md:order-none flex flex-col justify-center px-6 lg:px-12 py-12 lg:py-0"
            >
              {/* Badge/Sur-titre */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <span className="text-slate-500 text-sm uppercase tracking-wider font-medium">
                  L'engagement sans risque
                </span>
              </motion.div>

              {/* Titre H1 */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-5xl font-bold text-slate-900 mb-4 leading-tight"
              >
                L'application métier pour les praticiens qui libère votre temps.{" "}
                <span className="text-sauge">Gratuite à vie.</span>
              </motion.h1>

              {/* Sub-headline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="text-xl text-slate-600 mb-8 leading-relaxed"
              >
                Agenda, facturation et visibilité Google. Sans abonnement, ni frais fixes.
                Si vous ne gagnez rien, nous ne facturons rien.
              </motion.p>

              {/* Bloc Onboarding - Premium */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Lancez votre activité :
                </h3>
                <form onSubmit={handleStart} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <div className="flex-1 min-w-0">
                      <Combobox
                        options={[
                          ...professions.map(prof => ({
                            value: prof.name,
                            label: prof.name,
                          })),
                          {
                            value: 'other',
                            label: 'Autre',
                          },
                        ]}
                        value={isOtherProfession ? 'other' : job}
                        onValueChange={(value) => {
                          if (value === 'other') {
                            setIsOtherProfession(true);
                            setJob('');
                          } else {
                            setIsOtherProfession(false);
                            setJob(value);
                            setJobOther('');
                          }
                        }}
                        placeholder="Quelle est votre profession ?"
                        emptyText="Aucune profession trouvée"
                        maxHeight="400px"
                        className="w-full"
                        buttonClassName="w-full h-10 px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-[#9bb49b] focus:ring-2 focus:ring-[#9bb49b]/20 transition-all bg-white text-slate-900"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!job && !jobOther}
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 rounded-xl shadow-md bg-[#9bb49b] hover:bg-[#8aa48a] text-white flex-shrink-0 sm:w-auto w-full"
                    >
                      Commencer gratuitement
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                  {isOtherProfession && (
                    <div>
                      <input
                        type="text"
                        value={jobOther}
                        onChange={(e) => setJobOther(e.target.value)}
                        required
                        placeholder="Précisez votre profession"
                        className="w-full h-10 px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-[#9bb49b] focus:ring-2 focus:ring-[#9bb49b]/20 transition-all bg-white text-slate-900"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      />
                    </div>
                  )}
                </form>
              </motion.div>

            </motion.div>

            {/* Right Column - Inspiration (à droite sur desktop, sous le texte sur mobile) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="order-2 md:order-none block w-full h-64 sm:h-80 lg:h-full min-h-[16rem] lg:min-h-0 relative"
            >
              <div className="h-full relative w-full">
                <Image
                  src="/images/pro-praticienne-sourire.webp"
                  alt="Praticienne souriante"
                  fill
                  className="object-cover rounded-2xl lg:rounded-none"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Manifeste – remplissage persistant : chaque mot s’allume à 60 % viewport et reste allumé */}
      <section
        ref={manifestRef}
        className="relative bg-white min-h-screen flex items-center justify-center py-24 lg:py-32"
      >
        <div className="max-w-5xl mx-auto px-6 lg:px-12 w-full flex flex-col items-center justify-center">
          <p
            className="text-3xl sm:text-4xl lg:text-5xl text-center text-balance"
            style={{ fontFamily: "var(--font-manrope), sans-serif", lineHeight: "1.2" }}
          >
            {MANIFEST_WORDS.map((word, i) => (
              <motion.span
                key={`${i}-${word}`}
                style={{ color: manifestWordColors[i] }}
                className="inline-block whitespace-pre-wrap"
              >
                {word}{" "}
              </motion.span>
            ))}
          </p>
        </div>
      </section>

      {/* Fonctionnalités – Accordéon interactif */}
      <section className="py-24 px-4" id="fonctionnalites">
        <div className="max-w-[1200px] mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-16"
          >
            Tout ce dont vous avez besoin, au même endroit.
          </motion.h2>

          <div className="space-y-4">
            {FEATURES.map((feature, index) => (
              <FeatureAccordionCard
                key={feature.id}
                feature={feature}
                isExpanded={expandedFeatureId === feature.id}
                onToggle={() =>
                  setExpandedFeatureId((prev) => (prev === feature.id ? null : feature.id))
                }
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section Tarifs "Sérénité" */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-16"
          >
            Un modèle juste, basé sur votre succès.
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch"
          >
            {/* Plan Sérénité – en avant */}
            <motion.div
              variants={fadeInUp}
              className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border-2 border-[#9bb49b] flex flex-col"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-1">Holia Sérénité</h3>
                <p className="text-slate-600">0€ /mois</p>
              </div>
              <ul className="space-y-4 mb-6 flex-1">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">8% de commission sur les réservations en ligne.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Plafonné à 59€/mois (vous ne paierez jamais plus).</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Outils métier gratuits à vie.</span>
                </li>
              </ul>
              <div className="rounded-2xl bg-[#9bb49b]/10 border border-[#9bb49b]/30 p-4 mb-6">
                <p className="text-slate-800 font-medium text-center">
                  Le contrat de confiance : <span className="text-[#6b8f6b] font-semibold">Si vous ne gagnez rien, Holia ne facture rien.</span>
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="w-full rounded-xl shadow-md bg-[#9bb49b] hover:bg-[#8aa48a] text-white font-medium"
              >
                <Link href="/inscription?role=practitioner">Commencer gratuitement</Link>
              </Button>
            </motion.div>

            {/* Pack Installation – option de service */}
            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col"
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Pack Installation</h3>
                <p className="text-slate-600">50€ <span className="text-sm">une seule fois</span></p>
              </div>
              <ul className="space-y-4 mb-6 flex-1">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">Idéal pour démarrer sans perdre de temps.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">Récupération de vos données et création de fiche complète.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">Optimisation SEO personnalisée par nos experts.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">Mise en place de votre boutique de cartes cadeaux.</span>
                </li>
              </ul>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full rounded-xl border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-[#9bb49b]"
              >
                <Link href="/inscription?role=practitioner">Demander le pack</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SEO Footer */}
      {/* Professions Section */}
      <section className="py-32 px-4">
        <div className="max-w-[1600px] mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-16"
          >
            Holia accompagne tous les métiers du bien-être.
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto"
          >
            {[
              { name: "Naturopathe", icon: Leaf, slug: "naturopathe" },
              { name: "Sophrologue", icon: Waves, slug: "sophrologue" },
              { name: "Hypnothérapeute", icon: Brain, slug: "hypnotherapeute" },
              { name: "Ostéopathe", icon: Bone, slug: "osteopathe" },
              { name: "Réflexologue", icon: Hand, slug: "reflexologue" },
              { name: "Kinésithérapeute", icon: Activity, slug: "kinesitherapeute" },
              { name: "Psychologue", icon: Heart, slug: "psychologue" },
              { name: "Coach bien-être", icon: Target, slug: "coach-bien-etre" },
              { name: "Acupuncteur", icon: Sparkles, slug: "acupuncteur" },
              { name: "Magnétiseur", icon: Flower, slug: "magnetiseur" },
              { name: "Praticien Reiki", icon: Moon, slug: "praticien-reiki" },
              { name: "Thérapeute", icon: Shield, slug: "therapeute" },
            ].map(({ name, icon: Icon, slug }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -2 }}
              >
                <Link
                  href={`/profession/${slug}`}
                  className="group block p-6 bg-white rounded-3xl border border-slate-100 hover:border-[#9bb49b] hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-full flex items-center justify-center group-hover:bg-[#9bb49b]/20 transition-colors">
                      <Icon className="h-6 w-6 text-[#9bb49b]" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      {name}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Ressources blog – 3 derniers articles Conseils Pro */}
      <BlogSection
        title="Ressources pour développer votre cabinet"
        posts={blogPosts}
        linkUrl="/blog"
        linkLabel="Voir tout le blog"
        background="white"
      />

      {/* FAQ – accordéon style Shadcn */}
      <section className="py-24 lg:py-32 px-4" id="faq">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-16"
          >
            Questions fréquentes sur Holia
          </motion.h2>
          <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-200">
            {PRO_FAQ.map((item, i) => {
              const isOpen = faqOpenIndex === i;
              return (
                <div
                  key={i}
                  className="bg-white transition-colors hover:bg-slate-50/50"
                >
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 py-5 px-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <h3 className="text-slate-800 font-medium pr-4 m-0 text-base sm:text-lg">
                      {item.question}
                    </h3>
                    <span className="shrink-0 w-8 h-8 rounded-full bg-[#9bb49b]/10 flex items-center justify-center text-[#9bb49b]">
                      {isOpen ? (
                        <Minus className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      height: isOpen ? "auto" : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="text-slate-600 text-base leading-relaxed pb-5 px-6 pt-4 border-t border-slate-100 mt-0">
                      {item.answer}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ils nous font confiance – bloc type awwwards : typo sobre, grille, espace */}
      <section className="py-24 md:py-32 bg-[#fafaf9] border-t border-slate-100/80">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-400 mb-14"
          >
            Ils nous font confiance
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10 sm:gap-y-12"
          >
            {[
              "École de Sophrologie",
              "Institut de Naturopathie",
              "Centre Holistique",
              "Université de Médecine Alternative",
              "Fédération Française de Yoga",
              "Association des Praticiens en Reiki",
              "Centre de Formation en Aromathérapie",
              "Institut Français d'Hypnose",
              "Académie de Lithothérapie",
              "École Française de Shiatsu",
            ].map((partner, i) => (
              <div
                key={i}
                className="text-center"
              >
                <span
                  className="text-slate-400 font-medium text-sm sm:text-base tracking-tight hover:text-[#9bb49b] transition-colors duration-300 cursor-default block py-2"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {partner}
                </span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 pt-12 border-t border-slate-100 text-center"
          >
            <p className="text-slate-400 text-sm font-medium">
              Des organismes de formation et des fédérations du bien-être nous font confiance pour connecter leurs praticiens à leurs patients.
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
