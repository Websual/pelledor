"use client";
import Link from "next/link";
import Image from "next/image";
import { Heart, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  // Top 5 métiers pour les patients
  const topProfessions = [
    { name: "Sophrologue", slug: "sophrologue" },
    { name: "Naturopathe", slug: "naturopathe" },
    { name: "Ostéopathe", slug: "osteopathe" },
    { name: "Réflexologue", slug: "reflexologue" },
    { name: "Kinésithérapeute", slug: "kinesitherapeute" },
  ];

  // Liens pour les praticiens
  const practitionerLinks = [
    { name: "Tarifs", href: "/pro#pricing" },
    { name: "Logiciel de gestion", href: "/pro#features" },
    { name: "Inscription Pro", href: "/pro" },
  ];

  // 5 plus grandes villes de France
  const majorCities = [
    { name: "Paris", slug: "paris" },
    { name: "Marseille", slug: "marseille" },
    { name: "Lyon", slug: "lyon" },
    { name: "Toulouse", slug: "toulouse" },
    { name: "Nice", slug: "nice" },
  ];

  // Liens Holia
  const holiaLinks = [
    { name: "Aide", href: "/aide" },
    { name: "À propos", href: "/a-propos" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
    { name: "Presse", href: "/presse" },
  ];

  return (
    <footer className="bg-[#1a1a1a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Colonne 1: Marque */}
          <div className="space-y-6">
            <Link href="/" className="inline-block">
              <Image
                src="/images/logo-h-green.webp"
                alt="Holia - Logo"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              Connecter les praticiens de bien-être aux patients qui en ont besoin.
              Une plateforme française pour un bien-être accessible à tous.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-slate-400 hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors" aria-label="Instagram">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="https://www.linkedin.com/company/holia-me/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-6 w-6" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors" aria-label="YouTube">
                <Youtube className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Colonne 2: Pour les Patients */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6">Pour les Patients</h3>
            <ul className="space-y-3">
              {topProfessions.map((profession) => (
                <li key={profession.slug}>
                  <Link
                    href={`/profession/${profession.slug}`}
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    {profession.name}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  href="/recherche"
                  className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Voir tous les besoins →
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 3: Pour les Praticiens */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6">Pour les Praticiens</h3>
            <ul className="space-y-3">
              {practitionerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 4: Événements */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6">Événements</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/evenements?type=CONFERENCE"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Conférences
                </Link>
              </li>
              <li>
                <Link
                  href="/evenements?type=ATELIER"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Ateliers
                </Link>
              </li>
              <li>
                <Link
                  href="/evenements?type=STAGE"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Stages
                </Link>
              </li>
              <li className="pt-2">
                <Link
                  href="/evenements"
                  className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Tous les événements →
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 5: Villes */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6">Villes</h3>
            <ul className="space-y-3">
              {majorCities.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/recherche?city=${encodeURIComponent(city.name)}`}
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  href="/plan-du-site"
                  className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Plan du site →
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 6: Holia */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6">Holia</h3>
            <ul className="space-y-3">
              {holiaLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Ligne de séparation */}
        <div className="border-t border-slate-800 my-12"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-slate-400">
            <Link href="/mentions-legales" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <span className="hidden sm:block">•</span>
            <Link href="/cgu" className="hover:text-white transition-colors">
              CGU
            </Link>
            <span className="hidden sm:block">•</span>
            <Link href="/confidentialite" className="hover:text-white transition-colors">
              Politique de confidentialité
            </Link>
          </div>
          <p className="text-sm text-slate-400 flex items-center gap-2">
            Fait avec <Heart className="h-4 w-4 text-red-500 fill-red-500" /> en France
          </p>
        </div>
      </div>
    </footer>
  );
}

