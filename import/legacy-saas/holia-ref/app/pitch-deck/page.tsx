import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import { ScrollReveal } from "@/components/scroll-reveal";
import { VideoPlayer } from "@/components/video-player";
import { ProjectionChart } from "@/components/projection-chart";

import {
  Calendar,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  Users,
  MapPin,
  Rocket,
  Target,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ScatterChart,
  Clock,
  FileText,
  Zap,
  Globe,
  BarChart3,
  Megaphone,
  Building2,
  Code,
  DollarSign,
  UserPlus,
  Search,
  MessageSquare,
  Brain,
  AlertCircle,
  Shield,
  Check,
  Heart,
  Mail,
  Linkedin,
} from "lucide-react";


export function generateStaticParams() {
  return [{ locale: "fr" }];
}

export const metadata: Metadata = {
  title: "Pitch Deck • Holia.me | MVP Ready",
  description:
    "Découvrez Holia.me, la première plateforme moderne qui connecte patients et praticiens du bien-être. Le Doctolib du bien-être, en plus humain.",
  openGraph: {
    title: "Pitch Deck • Holia.me | MVP Ready",
    description:
      "Découvrez Holia.me, la première plateforme moderne qui connecte patients et praticiens du bien-être.",
    type: "website",
  },
};

export default function PitchDeckPage() {
  const currentYear = new Date().getFullYear();
  const siteUrl = "https://holia.me";

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sauge/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="#top" className="text-2xl font-bold font-heading text-sauge">
              Holia
            </Link>
            <Button
              asChild
              size="sm"
              className="bg-sauge hover:bg-sauge-dark text-white rounded-full"
            >
              <a href="mailto:contact@holia.me">
                <Mail className="h-4 w-4 mr-2" />
                Me contacter
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO (Full Viewport Height) */}
      <section id="top" className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden">
        {/* Background with overlay */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url(https://placehold.co/1920x1080/9bb49b/faf8f4?text=Holia)",
            }}
          />
          <div className="absolute inset-0 bg-[#f7f7f7]/80" />
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <p className="text-sm uppercase tracking-wider text-sauge mb-6 font-semibold">
              Pitch Deck • MVP Ready
            </p>
            <h1 className="text-5xl md:text-7xl font-bold font-heading text-anthracite mb-8 leading-tight">
              Le bien-être, enfin simple, organisé et accessible.
            </h1>
            <p className="text-xl md:text-2xl text-anthracite/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              La première plateforme moderne qui connecte patients et praticiens du bien-être.
              Le Doctolib du bien-être, en plus humain.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-sauge hover:bg-sauge-dark text-white rounded-full px-8 py-6 text-lg"
            >
              <Link href="/">
                Voir la démo live
                <ExternalLink className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>

      {/* SECTION 2: THE PAIN vs THE SHIFT (Full Screen Split 50/50 - Mirror Effect) */}
      <section className="min-h-screen flex flex-col md:flex-row">
        {/* Left Side - The Pain (Black Background) */}
        <div className="w-full md:w-1/2 bg-anthracite text-white flex items-center justify-center p-8 md:p-16 min-h-[50vh] md:min-h-screen">
          <ScrollReveal>
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold font-heading mb-12 text-sauge">
                Le frein à main
              </h2>
              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-sauge/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-sauge" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-heading mb-2">Marché opaque</h3>
                    <p className="text-white/80 text-lg">
                      Impossible de comparer ou de vérifier la fiabilité d&apos;un praticien
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-sauge/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Clock className="h-8 w-8 text-sauge" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-heading mb-2">Gestion manuelle</h3>
                    <p className="text-white/80 text-lg">
                      Prise de RDV par téléphone, perte de temps, &quot;No-shows&quot;
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-sauge/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Search className="h-8 w-8 text-sauge" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-heading mb-2">Isolement</h3>
                    <p className="text-white/80 text-lg">
                      Les praticiens sont invisibles sans budget marketing
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-sauge/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <FileText className="h-8 w-8 text-sauge" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-heading mb-2">Administration chronophage</h3>
                    <p className="text-white/80 text-lg">
                      Facturation, suivi client, rappels : tout est manuel et prend du temps
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Right Side - The Shift (Light Background) */}
        <div className="w-full md:w-1/2 bg-[#f7f7f7] flex items-center justify-center p-8 md:p-16 min-h-[50vh] md:min-h-screen">
          <ScrollReveal delay={200}>
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-12">
                L&apos;accélérateur
              </h2>
              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-sauge/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Shield className="h-8 w-8 text-sauge" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">Confiance rétablie</h3>
                    <p className="text-anthracite/80 text-lg">
                      Avis vérifiés et profils certifiés
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-sauge/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Zap className="h-8 w-8 text-sauge" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">Expérience fluide</h3>
                    <p className="text-anthracite/80 text-lg">
                      Réservation & Paiement instantanés, comme sur Doctolib
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-sauge/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-8 w-8 text-sauge" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">Professionnalisation</h3>
                    <p className="text-anthracite/80 text-lg">
                      Des outils SaaS puissants pour gérer l&apos;activité
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-sauge/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-8 w-8 text-sauge" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">Croissance facilitée</h3>
                    <p className="text-anthracite/80 text-lg">
                      Automatisation complète pour se concentrer sur sa pratique
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SECTION 2B: THE MARKET PROOF (Bento Grid - Full Screen) */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: "#e7eae2" }}>
        <div className="max-w-[95vw] mx-auto">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-4 text-center">
              Un marché prêt à basculer
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {/* Card 1: The Macro Trend */}
            <ScrollReveal>
              <div className="bg-[#f7f7f7] rounded-3xl p- border-2 border-sauge/20 shadow-lg h-full flex flex-col">
                <div className="w-16 h-16 bg-sauge/10 rounded-2xl flex items-center justify-center mb-6">
                  <Globe className="h-8 w-8 text-sauge" />
                </div>
                <div className="text-4xl md:text-5xl font-bold text-sauge mb-2">136 Mrds €</div>
                <p className="text-anthracite font-semibold text-lg mb-2">Économie du Bien-être (France)</p>
                <p className="text-anthracite/60 text-sm mt-auto">Source : Global Wellness Institute</p>
              </div>
            </ScrollReveal>

            {/* Card 2: The Target Market (Green Background) */}
            <ScrollReveal delay={100}>
              <div className="bg-sauge rounded-3xl p- text-white shadow-lg h-full flex flex-col">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="h-8 w-8" />
                </div>
                <div className="text-4xl md:text-5xl font-bold mb-2">2,6 Mrds €</div>
                <p className="text-white font-semibold text-lg mb-2">Marché des consultations</p>
                <p className="text-white/80 text-sm mt-auto">Source : Xerfi / Businesscoot</p>
              </div>
            </ScrollReveal>

            {/* Card 3: User Adoption */}
            <ScrollReveal delay={200}>
              <div className="bg-[#f7f7f7] rounded-3xl p- border-2 border-sauge/20 shadow-lg h-full flex flex-col">
                <div className="w-16 h-16 bg-sauge/10 rounded-2xl flex items-center justify-center mb-6">
                  <Heart className="h-8 w-8 text-sauge" />
                </div>
                <div className="text-4xl md:text-5xl font-bold text-sauge mb-2">71%</div>
                <p className="text-anthracite font-semibold text-lg mb-2">Des Français ont déjà consulté</p>
                <p className="text-anthracite/60 text-sm mt-auto">Source : Harris Interactive</p>
              </div>
            </ScrollReveal>

            {/* Card 4: Nombre de praticiens */}
            <ScrollReveal delay={300}>
              <div className="bg-[#f7f7f7] rounded-3xl p- border-2 border-sauge/20 shadow-lg h-full flex flex-col">
                <div className="w-16 h-16 bg-sauge/10 rounded-2xl flex items-center justify-center mb-6">
                  <Building2 className="h-8 w-8 text-sauge" />
                </div>
                <div className="text-4xl md:text-5xl font-bold text-sauge mb-2">+100 000</div>
                <p className="text-anthracite font-semibold text-lg mb-2">Praticiens indépendants en France</p>
                <p className="text-anthracite/60 text-sm mt-auto">
                  Sources : Registre ADELI, Syndicat des Sophrologues Indépendants, FENA, DREES
                </p>
              </div>
            </ScrollReveal>
          </div>

          <div className="mt-12 text-center">
            <p className="text-anthracite/70 text-lg max-w-3xl mx-auto italic">
              &quot;Alors que la demande explose (+12%/an), l&apos;offre reste fragmentée. Holia structure ce marché comme Doctolib l&apos;a fait pour la médecine conventionnelle.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: THE PRODUCT (Zig-Zag Layout with Screenshots) */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-4 text-center">
              Le produit : MVP fonctionnel et testable
            </h2>
            <p className="text-xl text-anthracite/70 mb-16 text-center max-w-3xl mx-auto">
              Une plateforme opérationnelle avec architecture scalable, prête pour le déploiement régional
            </p>
          </ScrollReveal>
        </div>

        {/* Zig-Zag Feature 1: Prise de rendez-vous */}
        <div className="mb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 items-center">
              <ScrollReveal className="order-2 md:order-1">
                <div>
                  <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold font-heading text-anthracite mb-4">
                    Prise de rendez-vous intuitive
                  </h3>
                  <p className="text-lg text-anthracite/70">
                    Une interface claire et fluide pour une réservation en quelques clics. L&apos;expérience patient est au cœur de notre design.
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100} className="md:col-span-2 order-1 md:order-2">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-sauge/20">
                  <VideoPlayer
                    src="/videos/booking-demo.mp4"
                    alt="Capture d'écran - Prise de rendez-vous"
                    fallbackImage="https://placehold.co/800x600/9bb49b/faf8f4?text=Capture+Agenda"
                  />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* Zig-Zag Feature 2: Agenda Intelligent (Reversed) */}
        <div className="mb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 items-center">
              <ScrollReveal className="md:order-1 order-1">
                <div>
                  <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-6">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold font-heading text-anthracite mb-4">
                    Agenda Intelligent
                  </h3>
                  <p className="text-lg text-anthracite/70">
                    Synchronisation automatique, gestion des disponibilités et rappels automatiques. Tout est automatisé pour le praticien.
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100} className="md:col-span-2 md:order-2 order-2">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-sauge/20">
                  <VideoPlayer
                    src="/videos/calendar-demo.mp4"
                    alt="Capture d'écran - Agenda intelligent"
                    fallbackImage="https://placehold.co/800x600/9bb49b/faf8f4?text=Capture+Agenda+Semaine"
                  />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* Zig-Zag Feature 3: Recherche géolocalisée */}
        <div className="mb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 items-center">
              <ScrollReveal className="order-2 md:order-1">
                <div>
                  <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-6">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold font-heading text-anthracite mb-4">
                    Recherche géolocalisée
                  </h3>
                  <p className="text-lg text-anthracite/70">
                    Trouvez les praticiens près de chez vous grâce à notre carte interactive. Filtrez par spécialité, disponibilité et avis vérifiés pour une recherche ultra-précise.
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100} className="md:col-span-2 order-1 md:order-2">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-sauge/20">
                  <VideoPlayer
                    src="/videos/recherche-demo.mp4"
                    alt="Capture d'écran - Recherche géolocalisée"
                    fallbackImage="https://placehold.co/800x600/9bb49b/faf8f4?text=Capture+Recherche+Carte"
                  />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden md:block">
          <ScrollReveal>
            <div className="bg-sauge/10 rounded-3xl p- md:p-12 border-2 border-sauge/30 text-center">
              <h3 className="text-2xl font-bold font-heading text-anthracite mb-4">
                Testez l&apos;expérience mobile maintenant
              </h3>
              <p className="text-anthracite/70 mb-6">
                Scannez le QR code pour accéder à la version mobile sur votre téléphone
              </p>
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-2xl shadow-lg">
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(siteUrl)}`}
                    alt="QR Code vers Holia.me"
                    width={200}
                    height={200}
                    className="w-48 h-48"
                  />
                </div>
              </div>
              <p className="text-sm text-anthracite/60">
                Ou visitez directement <Link href="/" className="text-sauge hover:underline font-semibold">holia.me</Link>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SECTION 2C: WHY HOLIA (Competitive Advantage) */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-[#f7f7f7]">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-4 text-center">
              Pourquoi Holia change la donne
            </h2>
            <p className="text-xl text-anthracite/70 mb-12 text-center max-w-3xl mx-auto">
              Alors que les acteurs existants (Médoucine, Resalib) fonctionnent sur un modèle d&apos;abonnement coûteux, 
              nous modernisons l&apos;approche avec une commission au succès et une UX de 2025.
            </p>
          </ScrollReveal>

          {/* Comparison Table */}
          <div className="mt-12 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Annuaires Classiques */}
              <ScrollReveal>
                <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-sauge/20 shadow-lg h-full flex flex-col">
                  <div className="bg-anthracite/5 rounded-3xl p- mb-6">
                    <h3 className="text-xl font-bold font-heading text-anthracite text-center">
                      Annuaires Classiques
                    </h3>
                  </div>
                  <div className="space-y-6 flex-1">
                    <div>
                      <p className="text-sm font-semibold text-anthracite/70 mb-2">Coût au lancement</p>
                      <p className="text-anthracite font-semibold">Élevé (Abonnement fixe)</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-anthracite/70 mb-2">Expérience Patient</p>
                      <p className="text-anthracite font-semibold">Dense & Complexe</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-anthracite/70 mb-2">Gestion complète</p>
                      <p className="text-anthracite font-semibold">Rarement</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-anthracite/70 mb-2">Accessibilité</p>
                      <p className="text-anthracite font-semibold">Barrière à l&apos;entrée</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Column 2: Logiciels Pros */}
              <ScrollReveal delay={100}>
                <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-sauge/20 shadow-lg h-full flex flex-col">
                  <div className="bg-anthracite/5 rounded-3xl p- mb-6">
                    <h3 className="text-xl font-bold font-heading text-anthracite text-center">
                      Logiciels Pros
                    </h3>
                  </div>
                  <div className="space-y-6 flex-1">
                    <div>
                      <p className="text-sm font-semibold text-anthracite/70 mb-2">Coût au lancement</p>
                      <p className="text-anthracite font-semibold">Élevé</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-anthracite/70 mb-2">Expérience Patient</p>
                      <p className="text-anthracite font-semibold">Inexistante (Outil interne)</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-anthracite/70 mb-2">Gestion complète</p>
                      <p className="text-anthracite font-semibold">Oui (Complexe)</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-anthracite/70 mb-2">Accessibilité</p>
                      <p className="text-anthracite font-semibold">Courbe d&apos;apprentissage</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Column 3: Holia (Highlighted) */}
              <ScrollReveal delay={200}>
                <div className="bg-sauge rounded-3xl p- md:p-8 text-white shadow-lg border-4 border-sauge-dark h-full flex flex-col relative pt-12">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-white text-sauge px-4 py-1 rounded-full text-sm font-semibold z-10">
                    Notre avantage
                  </div>
                  <div className="bg-white/20 rounded-3xl p- mb-6">
                    <h3 className="text-xl font-bold font-heading text-center">
                      Holia
                    </h3>
                  </div>
                  <div className="space-y-6 flex-1">
                    <div>
                      <p className="text-sm font-semibold text-white/80 mb-2">Coût au lancement</p>
                      <p className="text-white font-bold text-lg">0€ (Commission au succès)</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80 mb-2">Expérience Patient</p>
                      <p className="text-white font-bold text-lg">Moderne & Fluide (App like)</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80 mb-2">Gestion complète</p>
                      <p className="text-white font-bold text-lg">Oui (Simple & Tout-en-un)</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80 mb-2">Accessibilité</p>
                      <p className="text-white font-bold text-lg">Onboarding sans risque</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* Key Differentiators */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScrollReveal>
              <div className="bg-white rounded-3xl p-6 border-2 border-sauge/20 h-full flex flex-col">
                <div className="w-12 h-12 bg-sauge/10 rounded-2xl flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-sauge" />
                </div>
                <h3 className="text-lg font-bold font-heading text-anthracite mb-3">
                  L&apos;Accessibilité (Prix)
                </h3>
                <p className="text-anthracite/70 text-sm mb-2">
                  Les autres : Abonnements coûteux (Barrière à l&apos;entrée).
                </p>
                <p className="text-anthracite font-semibold text-sm">
                  Holia : Modèle au succès → Onboarding sans risque.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="bg-white rounded-3xl p-6 border-2 border-sauge/20 h-full flex flex-col">
                <div className="w-12 h-12 bg-sauge/10 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-sauge" />
                </div>
                <h3 className="text-lg font-bold font-heading text-anthracite mb-3">
                  L&apos;Expérience (UX)
                </h3>
                <p className="text-anthracite/70 text-sm mb-2">
                  Les autres : Annuaires &quot;froids&quot; et denses.
                </p>
                <p className="text-anthracite font-semibold text-sm">
                  Holia : Interface &quot;Bien-être&quot;, douce, moderne et rassurante.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="bg-white rounded-3xl p-6 border-2 border-sauge/20 h-full flex flex-col">
                <div className="w-12 h-12 bg-sauge/10 rounded-2xl flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-sauge" />
                </div>
                <h3 className="text-lg font-bold font-heading text-anthracite mb-3">
                  La Cible
                </h3>
                <p className="text-anthracite/70 text-sm mb-2">
                  Doctolib a abandonné ce marché. Médoucine trop élitiste.
                </p>
                <p className="text-anthracite font-semibold text-sm">
                  Holia : La maison de tous les praticiens sérieux.
                </p>
              </div>
            </ScrollReveal>
          </div>

          {/* Doctolib Opportunity */}
          <div className="mt-8 bg-sauge/10 rounded-3xl p- md:p-8 border-2 border-sauge/30">
            <div className="flex items-start gap-4">
              <Rocket className="h-8 w-8 text-sauge flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold font-heading text-anthracite mb-2">
                  L&apos;opportunité Doctolib
                </h3>
                <p className="text-anthracite/80">
                  En 2022-2023, <strong>Doctolib a banni les professions non réglementées</strong> (Naturopathes, Sophrologues, etc.), 
                  laissant environ <strong>5 700 praticiens</strong> sans solution du jour au lendemain. 
                  Holia est &quot;Le Doctolib de ceux que Doctolib ne veut plus&quot;.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: BUSINESS MODEL (2 Cards Comparison) */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-sauge/10">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-4 text-center">
              Modèle économique
            </h2>
            <p className="text-xl text-anthracite/70 mb-12 text-center">
              Pour les praticiens du bien-être
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-start">
            {/* Card 1: Starter */}
            <ScrollReveal>
              <div className="bg-white rounded-3xl p-8 border-2 border-sauge/20 shadow-lg h-full flex flex-col mt-[30px]">
                <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">
                  Découverte
                </h3>
                <div className="mb-6">
                  <div className="text-5xl font-bold text-anthracite mb-1">0€</div>
                  <p className="text-anthracite/60 text-sm">/ mois</p>
                </div>
                <p className="text-anthracite/70 mb-6">Idéal pour se lancer sans frais fixes.</p>
                <div className="bg-sauge/10 rounded-3xl p- mb-6 border border-sauge/20">
                  <p className="text-sm font-semibold text-sauge mb-1">Commission</p>
                  <p className="text-2xl font-bold text-anthracite">8% par séance</p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                    <span className="text-anthracite/80">Agenda en ligne</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                    <span className="text-anthracite/80">Paiement sécurisé intégré</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                    <span className="text-anthracite/80">Rappels par Emails illimités</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                    <span className="text-anthracite/80">Visibilité standard</span>
                  </li>
                </ul>
              </div>
            </ScrollReveal>

            {/* Card 2: Pro (Best Value) */}
            <ScrollReveal delay={200}>
              <div className="bg-white rounded-3xl p-8 border-4 border-sauge shadow-lg relative h-full flex flex-col pt-12">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-sauge text-white px-4 py-1 rounded-full text-sm font-semibold z-10">
                  Meilleure valeur
                </div>
                <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">
                  Essentiel
                </h3>
                <div className="mb-6">
                  <div className="text-5xl font-bold text-anthracite mb-1">59,90€</div>
                  <p className="text-anthracite/60 text-sm">HT / mois</p>
                </div>
                <p className="text-anthracite/70 mb-6">Pour les praticiens actifs.</p>
                <div className="bg-sauge rounded-3xl p- mb-6 text-white">
                  <p className="text-sm font-semibold mb-1">Commission</p>
                  <p className="text-2xl font-bold">0%</p>
                  <p className="text-xs mt-2 opacity-90">Seuil de bascule : 750€ de CA/mois</p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                    <span className="text-anthracite/80">Tout du pack Découverte</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                    <span className="text-anthracite/80">60 SMS de rappel / mois inclus (+ recharges)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                    <span className="text-anthracite/80">Synchronisation Google Agenda</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                    <span className="text-anthracite/80">Paiement sur place accepté</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                    <span className="text-anthracite/80">Statistiques avancées</span>
                  </li>
                </ul>
              </div>
            </ScrollReveal>
          </div>

          <p className="text-center text-anthracite/60 text-sm mt-8">
            Sans engagement. Changez d&apos;offre à tout moment.
          </p>
          
          {/* Benchmark Pricing */}
          <div className="mt-12 bg-white/50 rounded-3xl p- border border-sauge/20">
            <p className="text-sm text-anthracite/70 text-center mb-4">
              <strong className="text-anthracite">Positionnement prix :</strong> Médoucine 129€/mois • Doctolib 149€/mois • Resalib 29-39€/mois
            </p>
            <p className="text-sm text-anthracite/60 text-center">
              Holia à 59,90€ HT/mois : le &quot;Sweet Spot&quot; entre qualité professionnelle et accessibilité
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: PROJECTIONS FINANCIÈRES */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-4 text-center">
              Projections financières
            </h2>
            <p className="text-xl text-anthracite/70 mb-12 text-center max-w-3xl mx-auto">
              Trajectoire vers 5,8M€ d&apos;ARR en 36 mois
            </p>
            <p className="text-anthracite/70 text-center mb-12 max-w-3xl mx-auto">
              Avec un modèle hybride (Com + Abo 59€) et un marché de 110 000 praticiens, l&apos;objectif réaliste est d&apos;atteindre 5,8M€ de revenus récurrents en capturant seulement 7% du marché français.
            </p>
          </ScrollReveal>

          {/* Growth Projections Chart */}
          <ScrollReveal>
            <div className="bg-[#f7f7f7] rounded-3xl p- md:p-12 border-2 border-sauge/20">
              <ProjectionChart />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SECTION 6: ROADMAP & VISION (Timeline détaillée) */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-16 text-center">
              Roadmap & Vision
            </h2>
          </ScrollReveal>

          <div className="relative">
            {/* Vertical line for desktop */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-sauge/30" />

            <div className="space-y-12 md:space-y-16">
              {/* Maintenant */}
              <ScrollReveal>
                <div className="relative md:flex md:items-center md:justify-between">
                  <div className="md:w-5/12 md:text-right md:pr-8">
                    <div className="bg-sauge/10 rounded-3xl p- border-2 border-sauge/20">
                      <div className="flex items-center gap-3 mb-4 md:justify-end">
                        <Rocket className="h-6 w-6 text-sauge" />
                        <span className="text-sm font-semibold text-sauge uppercase tracking-wide">
                          Maintenant
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">
                        MVP Opérationnel
                      </h3>
                      <p className="text-anthracite/70">Architecture scalable, fonctionnalités core</p>
                    </div>
                  </div>
                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-sauge rounded-full border-4 border-white shadow-lg z-10" />
                  <div className="md:w-5/12" />
                </div>
              </ScrollReveal>

              {/* +3 Mois */}
              <ScrollReveal delay={100}>
                <div className="relative md:flex md:items-center md:justify-between">
                  <div className="md:w-5/12" />
                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-sauge rounded-full border-4 border-white shadow-lg z-10" />
                  <div className="md:w-5/12 md:pl-8">
                    <div className="bg-sauge/10 rounded-3xl p- border-2 border-sauge/20">
                      <div className="flex items-center gap-3 mb-4">
                        <Target className="h-6 w-6 text-sauge" />
                        <span className="text-sm font-semibold text-sauge uppercase tracking-wide">
                          +3 Mois
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">
                        Lancement Occitanie
                      </h3>
                      <p className="text-anthracite/70 mb-3">
                        20 praticiens pilotes, validation marché, premières réservations
                      </p>
                      <ul className="text-sm text-anthracite/60 space-y-1">
                        <li>• Acquisition ciblée praticiens</li>
                        <li>• Marketing local (SEO, réseaux sociaux)</li>
                        <li>• Programme early adopters</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* +6 Mois */}
              <ScrollReveal delay={200}>
                <div className="relative md:flex md:items-center md:justify-between">
                  <div className="md:w-5/12 md:text-right md:pr-8">
                    <div className="bg-sauge/10 rounded-3xl p- border-2 border-sauge/20">
                      <div className="flex items-center gap-3 mb-4 md:justify-end">
                        <UserPlus className="h-6 w-6 text-sauge" />
                        <span className="text-sm font-semibold text-sauge uppercase tracking-wide">
                          +6 Mois
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">
                        300 Praticiens Actifs
                      </h3>
                      <p className="text-anthracite/70 mb-3">
                        Expansion régionale, optimisation acquisition, rétention
                      </p>
                      <ul className="text-sm text-anthracite/60 space-y-1">
                        <li>• Partenariats avec écoles de formation</li>
                        <li>• Programme de parrainage praticiens</li>
                        <li>• Marketing digital intensifié</li>
                      </ul>
                    </div>
                  </div>
                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-sauge rounded-full border-4 border-white shadow-lg z-10" />
                  <div className="md:w-5/12" />
                </div>
              </ScrollReveal>

              {/* +12 Mois */}
              <ScrollReveal delay={300}>
                <div className="relative md:flex md:items-center md:justify-between">
                  <div className="md:w-5/12" />
                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-sauge rounded-full border-4 border-white shadow-lg z-10" />
                  <div className="md:w-5/12 md:pl-8">
                    <div className="bg-sauge/10 rounded-3xl p- border-2 border-sauge/20">
                      <div className="flex items-center gap-3 mb-4">
                        <Globe className="h-6 w-6 text-sauge" />
                        <span className="text-sm font-semibold text-sauge uppercase tracking-wide">
                          +12 Mois
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">
                        Expansion Nationale
                      </h3>
                      <p className="text-anthracite/70 mb-3">
                        1500+ praticiens, 5 régions, modèle éprouvé
                      </p>
                      <ul className="text-sm text-anthracite/60 space-y-1">
                        <li>• Déploiement multi-régions</li>
                        <li>• Équipe commerciale dédiée</li>
                        <li>• Marketing performance & brand</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* +24 Mois */}
              <ScrollReveal delay={400}>
                <div className="relative md:flex md:items-center md:justify-between">
                  <div className="md:w-5/12 md:text-right md:pr-8">
                    <div className="bg-sauge/10 rounded-3xl p- border-2 border-sauge/20">
                      <div className="flex items-center gap-3 mb-4 md:justify-end">
                        <Megaphone className="h-6 w-6 text-sauge" />
                        <span className="text-sm font-semibold text-sauge uppercase tracking-wide">
                          +24 Mois
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold font-heading text-anthracite mb-2">
                        Leader France
                      </h3>
                      <p className="text-anthracite/70 mb-3">
                        2000+ praticiens, marketplace produits, IA recommandations
                      </p>
                      <ul className="text-sm text-anthracite/60 space-y-1">
                        <li>• Marketplace produits bien-être</li>
                        <li>• IA de recommandation personnalisée</li>
                        <li>• Programme de fidélité clients</li>
                      </ul>
                    </div>
                  </div>
                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-sauge rounded-full border-4 border-white shadow-lg z-10" />
                  <div className="md:w-5/12" />
                </div>
              </ScrollReveal>

              {/* +36 Mois */}
              <ScrollReveal delay={500}>
                <div className="relative md:flex md:items-center md:justify-between">
                  <div className="md:w-5/12" />
                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-sauge rounded-full border-4 border-white shadow-lg z-10" />
                  <div className="md:w-5/12 md:pl-8">
                    <div className="bg-sauge rounded-3xl p- text-white border-2 border-sauge/20">
                      <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="h-6 w-6" />
                        <span className="text-sm font-semibold uppercase tracking-wide">
                          +36 Mois
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold font-heading mb-2">
                        Leader Europe
                      </h3>
                      <p className="text-white/90 mb-3">
                        10,000+ praticiens, expansion internationale, écosystème complet
                      </p>
                      <ul className="text-sm text-white/80 space-y-1">
                        <li>• Expansion Europe (Espagne, Italie, Allemagne)</li>
                        <li>• IA avancée & analytics prédictifs</li>
                        <li>• Partenariats stratégiques internationaux</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: THE TEAM */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-[#f7f7f7]">
        <div className="max-w-[95vw] mx-auto">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-16 text-center">
              L&apos;équipe
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Luc Michault Card - Left */}
            <ScrollReveal>
              <div className="bg-white rounded-3xl p-8 md:p-12 border-2 border-sauge/20 shadow-lg h-full flex flex-col">
                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
                  {/* Profile Photo */}
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-sauge/20 flex-shrink-0 mx-auto md:mx-0">
                    <Image
                      src="/images/luc-michault.webp"
                      alt="Luc Michault"
                      fill
                      className="object-cover object-top"
                    />
                  </div>

                  {/* Name, Title and LinkedIn */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                      <h3 className="text-3xl md:text-4xl font-bold font-heading text-anthracite">
                        Luc Michault
                      </h3>
                      <a
                        href="https://www.linkedin.com/in/luc-michault"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sauge hover:text-sauge-dark transition-colors"
                        aria-label="LinkedIn de Luc Michault"
                      >
                        <Linkedin className="h-6 w-6" />
                      </a>
                    </div>
                    <p className="text-xl text-sauge font-semibold">
                      Fondateur — Tech & Produit
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="text-anthracite/70 text-sm leading-relaxed">
                  <p>
                    Entrepreneur et développeur full-stack depuis 15+ ans, expert en UX, SEO, produit et lancement de MVP. Il transforme des idées en applications robustes, scalables et centrées utilisateur. Holia.me bénéficie de son expérience complète : vision, design, tech et exécution rapide.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Advisor Card - Right */}
            <ScrollReveal delay={200}>
              <div className="bg-sauge/10 rounded-3xl p- md:p-12 border-2 border-sauge/20 shadow-lg h-full flex flex-col">
                <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold font-heading text-anthracite mb-6">
                  Praticiens Advisor
                </h3>
                <p className="text-lg text-anthracite/70 mb-8">
                  X praticiens advisor qui nous aident à tester et à créer l&apos;outil le plus adapté à leurs besoins.
                </p>
                
                {/* Advisor Photos */}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-auto">
                  {[
                    { name: "Sophie Martin", role: "Naturopathe" },
                    { name: "Pierre Dubois", role: "Sophrologue" },
                    { name: "Marie Laurent", role: "Praticienne en Reiki" },
                    { name: "Jean Moreau", role: "Ostéopathe" },
                    { name: "Claire Bernard", role: "Praticienne en Hypnose" },
                  ].map((advisor, index) => (
                    <div
                      key={index}
                      className="relative group"
                    >
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
                        <Image
                          src="https://placehold.co/64x64/9bb49b/faf8f4?text=?"
                          alt={advisor.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-anthracite text-white text-xs rounded-2xl py-2 px-3 whitespace-nowrap shadow-lg">
                          <div className="font-semibold">{advisor.name}</div>
                          <div className="text-white/80">{advisor.role}</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-anthracite"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* SECTION 8: THE ASK (Investment - Projection réaliste) */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-sauge text-white">
        <div className="max-w-[95vw] mx-auto">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold font-heading mb-4 text-center">
              Objectif : Déployer la première région
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-12 text-center">
              Besoin de financement pour le lancement et la croissance
            </p>

            <div className="text-center mb-12">
              <div className="text-7xl md:text-8xl font-bold mb-4">100k€</div>
              <p className="text-xl text-white/90">Financement recherché</p>
            </div>

            {/* 5 Cards Full Screen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12 w-full">
              <div className="bg-white rounded-3xl p-6">
                <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-4">
                  <Code className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-anthracite mb-3">Développement</h3>
                <div className="text-3xl font-bold text-anthracite mb-1">25k€</div>
                <p className="text-anthracite/70 text-sm">
                  Finitions MVP, features avancées, optimisations performance
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6">
                <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-4">
                  <Megaphone className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-anthracite mb-3">Marketing & Acquisition</h3>
                <div className="text-3xl font-bold text-anthracite mb-1">30k€</div>
                <p className="text-anthracite/70 text-sm">
                  SEO, publicité digitale, contenu, événements, partenariats
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6">
                <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-4">
                  <UserPlus className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-anthracite mb-3">Onboarding Praticiens</h3>
                <div className="text-3xl font-bold text-anthracite mb-1">15k€</div>
                <p className="text-anthracite/70 text-sm">
                  Équipe commerciale, formation, support, programme pilotes
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6">
                <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-anthracite mb-3">Infrastructure & Scalabilité</h3>
                <div className="text-3xl font-bold text-anthracite mb-1">10k€</div>
                <p className="text-anthracite/70 text-sm">
                  Serveurs, CDN, monitoring, sécurité, automatisations
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6">
                <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-4">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-anthracite mb-3">Fond de roulement & Opérations</h3>
                <div className="text-3xl font-bold text-anthracite mb-1">20k€</div>
                <p className="text-anthracite/70 text-sm">
                  Trésorerie, frais opérationnels, imprévus (6 mois de sécurité)
                </p>
              </div>
            </div>

            {/* Objectifs */}
            <div className="bg-white rounded-3xl p-6 border-2 border-sauge/20">
              <h3 className="text-xl font-bold mb-6 text-center text-anthracite">Objectifs à 12 mois</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold mb-1 text-anthracite">1500+</div>
                  <p className="text-anthracite/70 text-sm">Praticiens actifs</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold mb-1 text-anthracite">5</div>
                  <p className="text-anthracite/70 text-sm">Régions couvertes</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold mb-1 text-anthracite">20k+</div>
                  <p className="text-anthracite/70 text-sm">Réservations / mois</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-sauge rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold mb-1 text-anthracite">39k€</div>
                  <p className="text-anthracite/70 text-sm">MRR (Revenu mensuel)</p>
                  <p className="text-anthracite/60 text-xs mt-1">
                    (ARPU lissé: 65€)
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-sauge/20 text-xs text-anthracite/70">
                <p className="text-center">
                  Projection scénario médian : 600 praticiens actifs (moyenne pondérée entre abo 59,90€ HT et commission 8%)
                </p>
                <p className="text-center mt-2">
                  Objectif : 468k€ ARR en An 1, 2,3M€ ARR en An 2, 5,8M€ ARR en An 3 (7% du marché)
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-anthracite text-white border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-white/70">
              © {currentYear} Holia.me. Tous droits réservés.
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/mentions-legales"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Mentions légales
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
