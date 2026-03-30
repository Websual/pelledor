import Link from "next/link";
import Image from "next/image";
import { Download, Mail, FileText, ChevronRight, FileOutput } from "lucide-react";
import type { Metadata } from "next";
import { FlyerA5 } from "@/components/flyer-a5";
import { PrintFlyerButton } from "@/components/print-flyer-button";

export const metadata: Metadata = {
  title: "Presse | Holia - Espace média",
  description:
    "Communiqués de presse, médiathèque et contact pour les journalistes. Holia, la plateforme française du bien-être holistique.",
};

const COMMUNIQUES = [
  {
    date: "15 janvier 2025",
    title: "Holia lance la première carte de France du bien-être",
    excerpt:
      "La startup béarnaise dévoile une carte interactive couvrant 36 000 communes, permettant aux Français de découvrir et réserver des praticiens du bien-être à proximité.",
    href: "#",
  },
  {
    date: "10 décembre 2024",
    title: "Websual et Holia : un partenariat pour démocratiser l'accès aux soins non conventionnels",
    excerpt:
      "Née à Idron dans les locaux de Websual, Holia s'appuie sur l'expertise technique du groupe pour proposer une plateforme 100 % made in France.",
    href: "#",
  },
];

const MEDIA_KIT_ASSETS = [
  { label: "Logo Holia (vert)", path: "/images/logo-h-green.webp" },
  { label: "Dashboard - Agenda & Réservations", path: "/images/pro-agenda-reservation.webp" },
  { label: "Dashboard - Profil praticien", path: "/images/pro-profil.webp" },
  { label: "Dashboard - Facturation", path: "/images/pro-facturation-automatique.webp" },
];

export default function PressePage() {
  return (
    <main className="min-h-screen bg-white text-anthracite">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-28">
        {/* Header */}
        <header className="border-b border-gray-200 pb-12 mb-12">
          <h1 className="text-3xl md:text-4xl font-bold font-heading text-anthracite mb-4">
            Espace Presse
          </h1>
          <p className="text-lg text-anthracite/70 leading-relaxed">
            Retrouvez nos communiqués, notre médiathèque et les coordonnées de
            notre service de presse.
          </p>
        </header>

        {/* Media Kit */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-anthracite mb-2 flex items-center gap-2">
            <Download className="h-5 w-5 text-anthracite" />
            Media Kit
          </h2>
          <p className="text-anthracite/70 mb-6">
            Téléchargez notre kit média contenant le logo Holia (versions vert, blanc et noir)
            et des captures HD du dashboard praticien.
          </p>
          <a
            href="/api/presse/media-kit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-anthracite text-white rounded-2xl hover:bg-anthracite/90 font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Télécharger le Media Kit (ZIP)
          </a>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {MEDIA_KIT_ASSETS.map((asset) => (
              <a
                key={asset.path}
                href={asset.path}
                download
                className="group block rounded-2xl border border-gray-200 p-4 hover:border-anthracite/30 transition-colors"
              >
                <div className="relative aspect-square bg-gray-50 rounded mb-3 overflow-hidden">
                  <Image
                    src={asset.path}
                    alt={asset.label}
                    fill
                    className="object-contain p-2"
                    sizes="150px"
                  />
                </div>
                <p className="text-sm font-medium text-anthracite group-hover:underline">
                  {asset.label}
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* Communiqués */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-anthracite mb-2 flex items-center gap-2">
            <FileText className="h-5 w-5 text-anthracite" />
            Communiqués de presse
          </h2>
          <p className="text-anthracite/70 mb-6">
            Nos dernières actualités et annonces.
          </p>
          <ul className="space-y-6">
            {COMMUNIQUES.map((cp, i) => (
              <li
                key={i}
                className="border-b border-gray-100 pb-6 last:border-0 last:pb-0"
              >
                <time className="text-sm text-anthracite/60">{cp.date}</time>
                <h3 className="text-lg font-semibold text-anthracite mt-1 mb-2">
                  {cp.title}
                </h3>
                <p className="text-anthracite/70 text-sm leading-relaxed">
                  {cp.excerpt}
                </p>
                <Link
                  href={cp.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-anthracite hover:underline mt-2"
                >
                  Lire le communiqué
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Outils de communication */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-anthracite mb-6 flex items-center gap-2">
            <FileOutput className="h-5 w-5 text-anthracite" />
            Outils de communication
          </h2>
          <h3 className="text-lg font-semibold text-anthracite mb-2">Dépliant Officiel</h3>
          <p className="text-anthracite/70 mb-6">
            Téléchargez et imprimez notre dépliant au format A5 pour vos événements et partenariats.
          </p>
          <PrintFlyerButton />
        </section>

        {/* Contact Presse */}
        <section>
          <h2 className="text-xl font-bold text-anthracite mb-2 flex items-center gap-2">
            <Mail className="h-5 w-5 text-anthracite" />
            Contact Presse
          </h2>
          <p className="text-anthracite/70 mb-4">
            Pour toute demande d&apos;interview, d&apos;information ou de visuels
            supplémentaires, contactez notre service de presse.
          </p>
          <a
            href="mailto:presse@holia.me"
            className="inline-flex items-center gap-2 text-lg font-medium text-anthracite hover:underline"
          >
            <Mail className="h-5 w-5" />
            presse@holia.me
          </a>
        </section>
      </div>

      {/* Dépliant A5 : caché à l'écran, visible à l'impression */}
      <FlyerA5 />
    </main>
  );
}
