"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function TeasingProSection() {
  const cardRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const maxTilt = 12;
      const x = ((e.clientY - centerY) / (rect.height / 2)) * -maxTilt;
      const y = ((e.clientX - centerX) / (rect.width / 2)) * maxTilt;
      setTilt({ x, y });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);


  return (
    <motion.section
      ref={sectionRef}
      className="relative w-full bg-sauge overflow-hidden pt-32 md:pt-40 pb-20 md:pb-28 lg:pb-32"
      initial={{ opacity: 0.85, scaleY: 0.97 }}
      animate={isInView ? { opacity: 1, scaleY: 1 } : {}}
      transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ transformOrigin: "center top" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 xl:gap-20 items-center">
          {/* Colonne gauche – Texte */}
          <motion.div
            className="order-2 lg:order-1 flex flex-col justify-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.span
              variants={itemVariants}
              className="inline-flex w-fit items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.2em] text-sauge-dark bg-sauge-light/90 mb-6"
            >
              ESPACE PRATICIENS
            </motion.span>
            <motion.h2
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading text-white leading-[1.1] tracking-tight mb-6"
            >
              Simplifiez. Gérez. Rayonnez.
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-white/90 max-w-lg leading-relaxed mb-10"
            >
              L&apos;application métier qui ne vous demande pas de loyer mensuel.
            </motion.p>
            <motion.div variants={itemVariants}>
              <Button asChild variant="saugeFillInverse">
                <Link href="/pro">
                  <span className="relative z-10 flex items-center gap-2">
                    Découvrir la solution Pro
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Colonne droite – Glass Card + visuel */}
          <motion.div
            ref={cardRef}
            className="order-1 lg:order-2 flex justify-center lg:justify-end"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <motion.div
              className="relative w-full max-w-md lg:max-w-lg"
              animate={{ y: [0, -20, 0] }}
              transition={{
                repeat: Infinity,
                duration: 5,
                ease: "easeInOut",
              }}
            >
              <div className="relative rounded-3xl bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/15 p-3 md:p-4">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/10">
                  <Image
                    src="/images/pro-gestion-zen.webp"
                    alt="Interface de gestion Holia Pro – agenda et visibilité"
                    fill
                    className="object-cover rounded-2xl"
                    sizes="(max-width: 1024px) 100vw,  min(512px, 50vw)"
                    priority={false}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
