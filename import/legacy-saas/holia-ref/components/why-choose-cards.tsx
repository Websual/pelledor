"use client";

import React, { useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import {
  ShieldCheck,
  Search,
  Lock,
  Star,
  Users,
  Eye,
} from "lucide-react";

const CARDS = [
  {
    icon: ShieldCheck,
    title: "Sélection rigoureuse",
    description: "Des praticiens certifiés et bienveillants.",
  },
  {
    icon: Search,
    title: "Recherche intuitive",
    description: "Filtrez par spécialité, ville et disponibilité en un clic.",
  },
  {
    icon: Lock,
    title: "Réservation 24h/7",
    description: "Prenez rendez-vous instantanément, n'importe quand.",
  },
  {
    icon: Star,
    title: "Avis certifiés",
    description: "Des retours authentiques de vrais patients.",
  },
  {
    icon: Users,
    title: "Support local",
    description: "Une équipe basée en France à votre écoute.",
  },
  {
    icon: Eye,
    title: "Transparence totale",
    description: "Aucun frais caché, les tarifs sont affichés clairement.",
  },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

function WhyChooseCard({
  item,
  index,
}: {
  item: (typeof CARDS)[number];
  index: number;
}) {
  const IconComponent = item.icon;
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMouse({ x, y });
      setIsHovered(true);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setMouse({ x: 50, y: 50 });
    setIsHovered(false);
  }, []);

  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      className="h-full"
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div
        className="relative h-full rounded-3xl border border-slate-100 bg-white p-6 md:p-8 overflow-hidden transition-shadow duration-300 hover:shadow-lg hover:shadow-slate-200/60"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          {
            "--mouse-x": `${mouse.x}%`,
            "--mouse-y": `${mouse.y}%`,
          } as React.CSSProperties
        }
      >
        {/* Spotlight / Border glow : gradient radial qui suit la souris */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(
              circle at var(--mouse-x) var(--mouse-y),
              rgba(155, 180, 155, 0.12) 0%,
              rgba(155, 180, 155, 0.04) 35%,
              transparent 60%
            )`,
          }}
        />

        {/* Contenu */}
        <div className="relative z-10">
          <motion.div
            className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9bb49b]/10 text-[#9bb49b]"
            whileHover={{
              scale: 1.08,
              rotate: 5,
              transition: { type: "spring", stiffness: 400, damping: 12 },
            }}
          >
            <IconComponent className="h-6 w-6" strokeWidth={1.75} />
          </motion.div>
          <h3 className="text-lg font-semibold text-anthracite mb-2">
            {item.title}
          </h3>
          <p className="text-sm text-anthracite/70 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function WhyChooseCards() {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {CARDS.map((item, index) => (
        <WhyChooseCard key={index} item={item} index={index} />
      ))}
    </motion.div>
  );
}
