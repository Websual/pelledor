"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Receipt, Shield, MapPin, Star } from "lucide-react";

function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [hasAnimated, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-wellness.webp"
            alt="Bien-être holistique"
            fill
            className="object-cover"
            style={{ objectPosition: "center 50%" }}
            priority
            quality={85}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-white/60 z-10" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading text-anthracite leading-tight mb-6">
            Holia : Réinventer l&apos;accès au bien-être
          </h1>
          <p className="text-xl md:text-2xl text-anthracite/80 leading-relaxed max-w-3xl mx-auto">
            Nous croyons en une santé holistique, transparente et accessible. Notre mission : connecter
            chaque patient au bon praticien, dans la confiance et la simplicité.
          </p>
        </div>
      </section>

      {/* Notre Histoire */}
      <section className="py-20 md:py-28 bg-[#f7f7f7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-anthracite">
                Notre Histoire
              </h2>
              <p className="text-lg text-anthracite/80 leading-relaxed">
                Holia est né dans les bureaux de Websual, à Idron, au cœur du Béarn. Une équipe
                passionnée par le bien-être et les technologies au service de l&apos;humain a voulu
                créer une plateforme différente : plus humaine, plus transparente, plus proche de vous.
              </p>
              <p className="text-lg text-anthracite/80 leading-relaxed">
                Conçu et développé en France, Holia incarne le savoir-faire hexagonal : rigueur,
                qualité et attention portée à chaque détail. Pas une startup délocalisée, mais un
                projet ancré dans nos territoires, au service des praticiens et des patients.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sauge/10 text-sauge font-medium">
                <span className="text-lg">🇫🇷</span>
                <span>100 % Made in France</span>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-xl">
              <Image
                src="/images/categories/sophrologie-1.webp"
                alt="Sérénité et bien-être à Idron"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Chiffres Clés */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="rounded-3xl bg-sable/50 p-8 md:p-10 text-center border border-gray-100">
              <p className="text-4xl md:text-5xl font-bold text-sauge mb-2">
                <AnimatedCounter target={45000} suffix="+" />
              </p>
              <p className="text-anthracite/80 font-medium">Praticiens</p>
            </div>
            <div className="rounded-3xl bg-sable/50 p-8 md:p-10 text-center border border-gray-100">
              <p className="text-4xl md:text-5xl font-bold text-sauge mb-2">
                <AnimatedCounter target={100} suffix="%" />
              </p>
              <p className="text-anthracite/80 font-medium">Vérifiés INSEE</p>
            </div>
            <div className="rounded-3xl bg-sable/50 p-8 md:p-10 text-center border border-gray-100">
              <p className="text-4xl md:text-5xl font-bold text-sauge mb-2">
                <AnimatedCounter target={36000} />
              </p>
              <p className="text-anthracite/80 font-medium">Communes couvertes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Nos Valeurs */}
      <section className="py-20 md:py-28 bg-[#f7f7f7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-anthracite mb-4">
              Nos Valeurs
            </h2>
            <p className="text-lg text-anthracite/70 max-w-2xl mx-auto">
              Ce qui nous guide au quotidien pour vous offrir la meilleure expérience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-sauge/10 flex items-center justify-center mb-6">
                <Receipt className="h-7 w-7 text-sauge" />
              </div>
              <h3 className="text-xl font-bold text-anthracite mb-3">Transparence</h3>
              <p className="text-anthracite/70 leading-relaxed">
                Facturation claire avec Stripe, décomposition lisible des montants (prestation,
                commission, frais). Vous savez toujours ce que vous payez et ce que vous recevez.
              </p>
            </div>
            <div className="rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-sauge/10 flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-sauge" />
              </div>
              <h3 className="text-xl font-bold text-anthracite mb-3">Sécurité</h3>
              <p className="text-anthracite/70 leading-relaxed">
                Chiffrement AES-256 pour vos données, paiements sécurisés, conformité RGPD. Votre
                santé et vos informations personnelles sont protégées.
              </p>
            </div>
            <div className="rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-sauge/10 flex items-center justify-center mb-6">
                <MapPin className="h-7 w-7 text-sauge" />
              </div>
              <h3 className="text-xl font-bold text-anthracite mb-3">Proximité</h3>
              <p className="text-anthracite/70 leading-relaxed">
                Conçu en France, pour la France. Une équipe à l&apos;écoute, un support réactif et
                une plateforme pensée pour les praticiens et patients de nos territoires.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Avis vérifiés */}
      <section id="avis" className="py-20 md:py-28 bg-white scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-sauge/10 flex items-center justify-center">
              <Star className="h-6 w-6 text-sauge" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-anthracite">
              Comment sont vérifiés les avis ?
            </h2>
          </div>
          <p className="text-lg text-anthracite/80 leading-relaxed">
            Les avis sur Holia sont authentiques et proviennent de clients ayant réellement utilisé les services.
            Après chaque rendez-vous, les clients peuvent laisser un avis avec une note et un commentaire. Les
            praticiens peuvent répondre aux avis pour partager leur expérience. Les avis sont modérés pour garantir
            leur authenticité et leur pertinence.
          </p>
        </div>
      </section>

      {/* Section zen finale */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative rounded-3xl overflow-hidden aspect-[21/9] max-h-[400px] mb-12">
            <Image
              src="/images/register-zen.webp"
              alt="Bien-être et sérénité"
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
          <p className="text-xl md:text-2xl text-anthracite/80 leading-relaxed max-w-3xl mx-auto">
            Rejoignez une communauté qui place l&apos;humain au centre. Praticiens vérifiés, patients
            informés, parcours simplifiés.
          </p>
        </div>
      </section>
    </main>
  );
}
