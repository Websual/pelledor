"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  LogOut,
  Menu,
  X,
  Map,
  Search,
  Calendar,
  CalendarCheck,
  Heart,
  Bell,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Star,
  MapPin,
  ChevronDown,
  ChevronRight,
  Shield,
  Sparkles,
  Brain,
  Moon,
  Activity,
  Baby,
  Users,
  FileCheck,
  Apple,
  LayoutGrid,
  CreditCard,
  HelpCircle,
  ShoppingBag,
  CalendarRange,
  Leaf,
  Wind,
  Eye,
  Footprints,
  Target,
  Zap,
  Hand,
  Newspaper,
  FileText,
  Briefcase,
  UserCheck,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { MegaMenuSearchInput } from "@/components/mega-menu-search-input";

const SUBJECTS = [
  { slug: "stress-anxiete", name: "Stress & Anxiété", desc: "Gérer stress et anxiété", icon: Brain },
  { slug: "sommeil", name: "Troubles du Sommeil", desc: "Retrouver un sommeil réparateur", icon: Moon },
  { slug: "douleurs", name: "Douleurs Chroniques", desc: "Soulager les douleurs", icon: Heart },
  { slug: "digestion", name: "Problèmes Digestifs", desc: "Améliorer la digestion", icon: Apple },
  { slug: "sport-performance", name: "Sport & Performance", desc: "Optimiser vos performances", icon: Activity },
  { slug: "grossesse", name: "Grossesse & Périnatalité", desc: "Accompagnement maternité", icon: Baby },
  { slug: "enfants", name: "Santé des Enfants", desc: "Bien-être des tout-petits", icon: Users },
  { slug: "seniors", name: "Bien-être Seniors", desc: "Prendre soin des aînés", icon: User },
  { slug: "allergies", name: "Allergies & Intolérances", desc: "Mieux vivre avec les allergies", icon: Shield },
  { slug: "peau", name: "Problèmes de Peau", desc: "Soins cutanés naturels", icon: Sparkles },
];

const PROFESSIONS = [
  { slug: "naturopathe", name: "Naturopathe", desc: "Médecine naturelle", icon: Leaf },
  { slug: "sophrologue", name: "Sophrologue", desc: "Relaxation et respiration", icon: Wind },
  { slug: "hypnotherapeute", name: "Hypnothérapeute", desc: "Thérapie par l'hypnose", icon: Eye },
  { slug: "osteopathe", name: "Ostéopathe", desc: "Traitement manuel", icon: Activity },
  { slug: "reflexologue", name: "Réflexologue", desc: "Réflexologie plantaire", icon: Footprints },
  { slug: "kinesitherapeute", name: "Kinésithérapeute", desc: "Rééducation physique", icon: Activity },
  { slug: "psychologue", name: "Psychologue", desc: "Accompagnement psychologique", icon: Brain },
  { slug: "coach-bien-etre", name: "Coach bien-être", desc: "Objectifs et motivation", icon: Target },
  { slug: "acupuncteur", name: "Acupuncteur", desc: "Médecine traditionnelle chinoise", icon: Zap },
  { slug: "magnetiseur", name: "Magnétiseur", desc: "Soins énergétiques", icon: Hand },
  { slug: "praticien-reiki", name: "Praticien Reiki", desc: "Énergie et relaxation", icon: Sparkles },
  { slug: "therapeute", name: "Thérapeute", desc: "Accompagnement global", icon: Heart },
];

const APROPOS_LINKS = [
  { href: "/a-propos", name: "Nos engagements", desc: "Transparence, sécurité, proximité", icon: Shield },
  { href: "/charte-deontologique", name: "Charte déontologique", desc: "Valeurs et éthique", icon: FileCheck },
  { href: "/a-propos#avis", name: "Vérification des avis", desc: "Authenticité et modération", icon: Star },
  { href: "/remboursement", name: "Mutuelles", desc: "Forfaits et prise en charge", icon: CreditCard },
  { href: "/blog", name: "Blog", desc: "Articles et conseils bien-être", icon: FileText },
  { href: "/presse", name: "Presse", desc: "Communiqués et médias", icon: Newspaper },
];

const dropdownItemClass =
  "flex items-start gap-3 px-4 py-3 text-left outline-none cursor-pointer hover:bg-gray-50/80 transition-colors first:rounded-t-2xl last:rounded-b-2xl rounded-2xl";

// Style SaaS Premium : icônes 18px #9bb49b, texte text-sm font-medium text-slate-600
const NAV_ICON_CLASS = "h-[18px] w-[18px] text-[#9bb49b] flex-shrink-0";
const NAV_LINK_CLASS = "flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sauge transition-colors px-3 py-2 rounded-full hover:bg-gray-50";

export function FloatingNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileBesoinsOpen, setMobileBesoinsOpen] = useState(false);
  const [mobileMetiersOpen, setMobileMetiersOpen] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const proMenuRef = useRef<HTMLDivElement>(null);
  const megaMenuJustClosedRef = useRef(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [proMenuOpen, setProMenuOpen] = useState(false);

  // Récupérer le compte de notifications non lues pour les praticiens
  const { data: notificationCount = 0 } = useQuery<number>({
    queryKey: ["notificationCount"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/count");
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: status === "authenticated",
    refetchInterval: 30000,
  });

  // Nombre de praticiens (menu Découvrir)
  const { data: practitionerCount } = useQuery<number>({
    queryKey: ["statsPractitionerCount"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) return 0;
      const data = await res.json();
      return data.practitionerCount ?? 0;
    },
    staleTime: 60 * 1000,
  });
  const practitionerCountFormatted =
    practitionerCount != null ? practitionerCount.toLocaleString("fr-FR") : null;

  // Detect scroll for shadow enhancement
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Raccourci Cmd/Ctrl + K → /recherche (carte)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        router.push("/recherche");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Body scroll lock quand overlay Découvrir OU menu mobile ouvert
  useEffect(() => {
    if (megaMenuOpen || mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [megaMenuOpen, mobileMenuOpen]);

  // Fermer les menus : clic à l'extérieur ou Échap
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) setAvatarDropdownOpen(false);
      if (proMenuRef.current && !proMenuRef.current.contains(event.target as Node)) setProMenuOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAvatarDropdownOpen(false);
        setProMenuOpen(false);
        setMobileMenuOpen(false);
        megaMenuJustClosedRef.current = true;
        setMegaMenuOpen(false);
        setTimeout(() => { megaMenuJustClosedRef.current = false; }, 250);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);


  const getUserInitials = () => {
    if (!session?.user?.name) return "?";
    return session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Image profil : session.user.image (uploadée dans /pro/profile ou /account/profile)
  const getAvatarImage = () => session?.user?.image || null;

  // Avatar : affiche session.user.image si présente, sinon initiales (ouverture au survol)
  const AvatarButton = ({ className = "" }: { className?: string }) => {
    const [imgError, setImgError] = useState(false);
    const img = getAvatarImage();
    const showImage = img && !imgError;
    return (
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full bg-sauge/10 hover:bg-sauge/20 transition-colors border border-sauge/20 overflow-hidden cursor-pointer ${className}`}
      >
        {showImage ? (
          <Image
            src={img}
            alt={session?.user?.name || "Profil"}
            width={32}
            height={32}
            className="w-full h-full rounded-full object-cover"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <span className="text-xs font-semibold text-sauge">{getUserInitials()}</span>
        )}
      </div>
    );
  };

  const decouvrirMenuRef = useRef<HTMLDivElement>(null);

  const closeMegaMenu = () => {
    megaMenuJustClosedRef.current = true;
    setMegaMenuOpen(false);
    setTimeout(() => { megaMenuJustClosedRef.current = false; }, 250);
  };

  const DecouvrirMegaMenu = () => (
    <>
      <div ref={decouvrirMenuRef} className="relative">
        <button
          type="button"
          onClick={() => {
            if (megaMenuJustClosedRef.current) return;
            setMegaMenuOpen(!megaMenuOpen);
          }}
          className={`${NAV_LINK_CLASS} shrink-0`}
          title="Découvrir"
          aria-label="Menu Découvrir"
          aria-expanded={megaMenuOpen}
        >
          <Sparkles className={NAV_ICON_CLASS} />
          <span className="hidden min-[1281px]:inline">Découvrir</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${megaMenuOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {megaMenuOpen && (
          <motion.div
            key="decouvrir-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
            role="dialog"
            aria-modal
            aria-label="Menu Découvrir"
          >
            {/* Backdrop : clic ferme l'overlay */}
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-md cursor-pointer"
              onClick={closeMegaMenu}
              aria-hidden
            />
            {/* Contenu : fond blanc, rounded-[40px], ombre douce */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-[1400px] flex-1 flex flex-col bg-white rounded-[40px] shadow-[0_4px_40px_rgba(0,0,0,0.06)] overflow-hidden min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bouton X en haut à droite */}
              <div className="flex justify-end p-4 shrink-0">
                <button
                  type="button"
                  onClick={closeMegaMenu}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              {/* Header : titre + recherche + phrase d'accroche */}
              <div className="px-12 pb-6 border-b border-gray-100 shrink-0">
                <div className="flex flex-row items-center justify-between gap-6">
                  <h2 className="text-3xl font-bold text-anthracite shrink-0">Tout Holia en un coup d&apos;œil.</h2>
                  <MegaMenuSearchInput onClose={closeMegaMenu} />
                  <p className="text-slate-600 text-sm whitespace-nowrap shrink-0">
                    Trouvez des solutions naturelles parmi {practitionerCountFormatted ?? "…"} praticiens certifiés.
                  </p>
                </div>
              </div>
              {/* Grille 5 colonnes : Icône + Titre uniquement */}
              <div className="grid grid-cols-5 gap-x-12 flex-1 min-h-0 overflow-auto px-12 pt-12 pb-0">
                {/* Col 1: À propos + Ressources */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">À propos</h3>
                  <ul className="space-y-1 mb-8">
                    {APROPOS_LINKS.filter((l) => ["/a-propos", "/charte-deontologique"].includes(l.href) || l.href === "/a-propos#avis").map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={closeMegaMenu}
                            className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors group text-sm whitespace-nowrap"
                          >
                            <Icon className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                            <span className="font-medium text-anthracite group-hover:text-sauge transition-colors">{item.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Ressources</h3>
                  <ul className="space-y-1">
                    {APROPOS_LINKS.filter((l) => ["/blog", "/presse", "/remboursement"].includes(l.href)).map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={closeMegaMenu}
                            className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors group text-sm whitespace-nowrap"
                          >
                            <Icon className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                            <span className="font-medium text-anthracite group-hover:text-sauge transition-colors">{item.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {/* Col 2 & 3: Besoins (10 items) */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Par besoin</h3>
                  <ul className="space-y-1">
                    {SUBJECTS.slice(0, 5).map((s) => {
                      const Icon = s.icon;
                      return (
                        <li key={s.slug}>
                          <Link
                            href={`/sujet/${s.slug}`}
                            onClick={closeMegaMenu}
                            className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors group text-sm whitespace-nowrap"
                          >
                            <Icon className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                            <span className="font-medium text-anthracite group-hover:text-sauge transition-colors">{s.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 opacity-0">Par besoin</h3>
                  <ul className="space-y-1">
                    {SUBJECTS.slice(5).map((s) => {
                      const Icon = s.icon;
                      return (
                        <li key={s.slug}>
                          <Link
                            href={`/sujet/${s.slug}`}
                            onClick={closeMegaMenu}
                            className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors group text-sm whitespace-nowrap"
                          >
                            <Icon className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                            <span className="font-medium text-anthracite group-hover:text-sauge transition-colors">{s.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {/* Col 4 & 5: Métiers (12 items) */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Par métier</h3>
                  <ul className="space-y-1">
                    {PROFESSIONS.slice(0, 6).map((p) => {
                      const Icon = p.icon;
                      return (
                        <li key={p.slug}>
                          <Link
                            href={`/profession/${p.slug}`}
                            onClick={closeMegaMenu}
                            className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors group text-sm whitespace-nowrap"
                          >
                            <Icon className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                            <span className="font-medium text-anthracite group-hover:text-sauge transition-colors">{p.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 opacity-0">Par métier</h3>
                  <ul className="space-y-1">
                    {PROFESSIONS.slice(6).map((p) => {
                      const Icon = p.icon;
                      return (
                        <li key={p.slug}>
                          <Link
                            href={`/profession/${p.slug}`}
                            onClick={closeMegaMenu}
                            className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors group text-sm whitespace-nowrap"
                          >
                            <Icon className="h-6 w-6 text-[#9bb49b] flex-shrink-0" />
                            <span className="font-medium text-anthracite group-hover:text-sauge transition-colors">{p.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              {/* Footer : barre de réassurance (épouse le bas du menu) */}
              <div className="shrink-0 h-20 flex items-center justify-between px-12 border-t border-gray-100 bg-slate-50/80 rounded-b-[40px]">
                <span className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                  <ShieldCheck className="h-4 w-4 text-[#9bb49b] shrink-0" />
                  {practitionerCountFormatted ?? "…"} Praticiens certifiés
                </span>
                <span className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                  <Lock className="h-4 w-4 text-[#9bb49b] shrink-0" />
                  Échanges confidentiels
                </span>
                <span className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                  <CreditCard className="h-4 w-4 text-[#9bb49b] shrink-0" />
                  Transactions sécurisées
                </span>
                <span className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                  <Star className="h-4 w-4 text-[#9bb49b] shrink-0" />
                  Avis authentiques
                </span>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );

  const GuestNavRight = () => (
    <>
      <div ref={proMenuRef} className="relative">
        <button
          type="button"
          onClick={() => setProMenuOpen(!proMenuOpen)}
          className={`${NAV_LINK_CLASS} shrink-0`}
          title="Espace Pro"
          aria-label="Menu Espace Pro"
          aria-expanded={proMenuOpen}
        >
          <Briefcase className={NAV_ICON_CLASS} />
          <span className="hidden min-[1281px]:inline">Espace Pro</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${proMenuOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {proMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 top-full pt-2 z-[9999]"
            >
              <div className="min-w-[280px] bg-white rounded-3xl border border-gray-100 shadow-xl shadow-black/8 py-2">
                <Link href="/pro" className={dropdownItemClass}>
                  <LayoutGrid className="h-[18px] w-[18px] text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-anthracite block">Logiciel de gestion</span>
                    <span className="text-xs text-gray-500">Agenda, RDV, facturation</span>
                  </div>
                </Link>
                <Link href="/aide/pro" className={dropdownItemClass}>
                  <HelpCircle className="h-5 w-5 text-sauge flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-anthracite block">Aide & Support</span>
                    <span className="text-xs text-gray-500">Guides et centre d&apos;aide</span>
                  </div>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Link href="/connexion">
        <Button variant="ghost" size="sm" className="text-sm">
          Se connecter
        </Button>
      </Link>
      <Button asChild variant="saugeFill" size="sm" className="!text-sm" style={{ padding: "0.5rem 1rem", minHeight: "auto" }}>
        <Link href="/inscription">
          <span className="relative z-10 flex items-center gap-2">
            S&apos;inscrire
          </span>
        </Link>
      </Button>
    </>
  );

  // Patient Navigation (droite uniquement) - Notifications = icône + badge uniquement
  const PatientNavRight = () => (
    <>
      <Link
        href="/account/notifications"
        className={`${NAV_LINK_CLASS} shrink-0`}
        title="Notifications"
      >
        <div className="relative">
          <Bell className={NAV_ICON_CLASS} />
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </div>
      </Link>
      <div className="relative" ref={avatarRef}>
        <div role="button" tabIndex={0} onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)} onKeyDown={(e) => e.key === "Enter" && setAvatarDropdownOpen(!avatarDropdownOpen)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-sauge/30 cursor-pointer">
          <AvatarButton />
        </div>
        <AnimatePresence>
          {avatarDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-56 bg-white rounded-3xl border border-gray-100 shadow-lg py-2 z-[9999] overflow-hidden"
            >
              <Link href="/account/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <LayoutDashboard className="h-[18px] w-[18px] text-[#9bb49b]" /> Dashboard
              </Link>
              <Link href="/account/appointments" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <UserCheck className="h-[18px] w-[18px] text-[#9bb49b]" /> Mes RDV
              </Link>
              <Link href="/account/events" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <CalendarRange className="h-[18px] w-[18px] text-[#9bb49b]" /> Mes Événements
              </Link>
              <Link href="/account/favorites" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <Heart className="h-[18px] w-[18px] text-[#9bb49b]" /> Mes Favoris
              </Link>
              <Link href="/account/messages" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <MessageSquare className="h-[18px] w-[18px] text-[#9bb49b]" /> Mes Messages
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <Link href="/account/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <User className="h-[18px] w-[18px] text-[#9bb49b]" /> Mon Profil
              </Link>
              <Link href="/account/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <Settings className="h-[18px] w-[18px] text-[#9bb49b]" /> Paramètres
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => { signOut({ callbackUrl: "/" }); setAvatarDropdownOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-anthracite hover:bg-gray-50 transition-colors text-left">
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  // Admin Navigation (droite uniquement)
  const AdminNavRight = () => (
    <>
      <div className="relative" ref={avatarRef}>
        <div role="button" tabIndex={0} onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)} onKeyDown={(e) => e.key === "Enter" && setAvatarDropdownOpen(!avatarDropdownOpen)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-sauge/30 cursor-pointer">
          <AvatarButton />
        </div>
        <AnimatePresence>
          {avatarDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-3xl border border-gray-100 shadow-lg py-2 z-[9999] overflow-hidden"
            >
              <Link
                href="/account/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
                onClick={() => setAvatarDropdownOpen(false)}
              >
                <User className="h-[18px] w-[18px] text-[#9bb49b]" />
                Mon Profil
              </Link>
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
                onClick={() => setAvatarDropdownOpen(false)}
              >
                <LayoutDashboard className="h-[18px] w-[18px] text-[#9bb49b]" />
                Dashboard Admin
              </Link>
              <Link
                href="/account/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
                onClick={() => setAvatarDropdownOpen(false)}
              >
                <Settings className="h-[18px] w-[18px] text-[#9bb49b]" />
                Paramètres
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  signOut({ callbackUrl: "/" });
                  setAvatarDropdownOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-anthracite hover:bg-gray-50 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  // Practitioner Navigation - Agenda, RDV (UserCheck), Notifications icône seule, textes masqués si <1280px
  const PractitionerNavRight = () => (
    <>
      <Link
        href="/pro/calendar"
        className={`${NAV_LINK_CLASS} shrink-0`}
        title="Agenda"
      >
        <Calendar className={NAV_ICON_CLASS} />
        <span className="hidden min-[1281px]:inline">Agenda</span>
      </Link>
      <Link
        href="/pro/appointments"
        className={`${NAV_LINK_CLASS} shrink-0`}
        title="RDV"
      >
        <UserCheck className={NAV_ICON_CLASS} />
        <span className="hidden min-[1281px]:inline">RDV</span>
      </Link>
      <Link
        href="/pro/notifications"
        className={`${NAV_LINK_CLASS} shrink-0`}
        title="Notifications"
      >
        <div className="relative">
          <Bell className={NAV_ICON_CLASS} />
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </div>
      </Link>
      <div className="relative" ref={avatarRef}>
        <div role="button" tabIndex={0} onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)} onKeyDown={(e) => e.key === "Enter" && setAvatarDropdownOpen(!avatarDropdownOpen)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-sauge/30 cursor-pointer">
          <AvatarButton />
        </div>
        <AnimatePresence>
          {avatarDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-56 bg-white rounded-3xl border border-gray-100 shadow-lg py-2 z-[9999] overflow-hidden"
            >
              <Link href="/pro/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-anthracite hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <LayoutDashboard className="h-4 w-4 text-sauge" /> Dashboard
              </Link>
              <Link href="/pro/calendar" className="flex items-center gap-2 px-4 py-2.5 text-sm text-anthracite hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <Calendar className="h-4 w-4 text-sauge" /> Agenda
              </Link>
              <Link href="/pro/appointments" className="flex items-center gap-2 px-4 py-2.5 text-sm text-anthracite hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <CalendarCheck className="h-4 w-4 text-sauge" /> Rendez-vous
              </Link>
              <Link href="/pro/events" className="flex items-center gap-2 px-4 py-2.5 text-sm text-anthracite hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <CalendarRange className="h-4 w-4 text-sauge" /> Mes Événements
              </Link>
              <Link href="/pro/boutique" className="flex items-center gap-2 px-4 py-2.5 text-sm text-anthracite hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <ShoppingBag className="h-4 w-4 text-sauge" /> Boutique
              </Link>
              <Link href="/pro/reviews" className="flex items-center gap-2 px-4 py-2.5 text-sm text-anthracite hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <Star className="h-4 w-4 text-sauge" /> Avis
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <Link href="/pro/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-anthracite hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <User className="h-4 w-4 text-sauge" /> Mon Profil Public
              </Link>
              <Link href="/pro/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-anthracite hover:bg-gray-50 transition-colors" onClick={() => setAvatarDropdownOpen(false)}>
                <Settings className="h-4 w-4 text-sauge" /> Paramètres
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => { signOut({ callbackUrl: "/" }); setAvatarDropdownOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors text-left">
                <LogOut className="h-[18px] w-[18px] text-[#9bb49b]" /> Déconnexion
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Floating Navbar */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-[2000] w-full flex justify-center px-4 sm:px-6">
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full md:w-fit md:min-w-[500px] md:max-w-[1200px] rounded-full bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 overflow-visible"
        >
          <div className="flex flex-row items-center justify-between w-full gap-4 px-8 py-3 min-w-0 min-h-[52px]">
            {/* Left: Logo (zone visuelle distincte) */}
            <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
              <Image
                src="/images/logo-h-green.webp"
                alt="Holia"
                width={30}
                height={30}
                className="max-h-[30px] w-auto"
              />
              <span className="text-xl font-bold font-heading text-sauge">Holia</span>
              {session?.user?.role === "PRACTITIONER" && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-sauge text-white rounded-full">
                  PRO
                </span>
              )}
              {session?.user?.role === "ADMIN" && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded-full">
                  ADMIN
                </span>
              )}
            </Link>

            {/* Center: Carte | Événements | Découvrir + nav droite */}
            <div className="hidden md:flex flex-1 flex-row flex-nowrap items-center justify-center gap-2 min-w-0 overflow-visible">
              {/* Carte : lien direct vers /recherche (45k points) */}
              <Link
                href="/recherche"
                className={`${NAV_LINK_CLASS} shrink-0`}
                title="Carte"
              >
                <Map className={NAV_ICON_CLASS} />
                <span className="hidden min-[1281px]:inline">Carte</span>
              </Link>
              {/* Événements */}
              <Link
                href="/evenements"
                className={`${NAV_LINK_CLASS} shrink-0`}
                title="Événements"
              >
                <CalendarRange className={NAV_ICON_CLASS} />
                <span className="hidden min-[1281px]:inline">Événements</span>
              </Link>
              {/* Découvrir (toujours visible) */}
              <DecouvrirMegaMenu />
              {/* Nav droite selon rôle */}
              <div className="flex flex-nowrap items-center gap-1 shrink-0">
                {status === "loading" || status === "unauthenticated" || !session ? (
                  <GuestNavRight />
                ) : session.user.role === "ADMIN" ? (
                  <AdminNavRight />
                ) : session.user.role === "PRACTITIONER" ? (
                  <PractitionerNavRight />
                ) : (
                  <PatientNavRight />
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 -mr-2"
              onClick={() => {
                const wasOpen = mobileMenuOpen;
                setMobileMenuOpen(!mobileMenuOpen);
                if (wasOpen) {
                  setMobileBesoinsOpen(false);
                  setMobileMetiersOpen(false);
                }
              }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-anthracite" />
              ) : (
                <Menu className="h-5 w-5 text-anthracite" />
              )}
            </button>
          </div>
        </motion.nav>
      </header>

      {/* Mobile Full Screen Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/95 backdrop-blur-md z-[2100] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed top-20 left-4 right-4 bottom-4 z-[2101] md:hidden bg-white rounded-3xl border border-gray-100 shadow-xl flex flex-col max-h-[calc(100vh-6rem)] overflow-hidden"
            >
              <nav className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4">
                {status === 'loading' || status === 'unauthenticated' || !session ? (
                  <>
                    <Link
                      href="/recherche"
                      className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sauge transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Search className="h-4 w-4 text-[#9bb49b]" /> Recherche
                    </Link>
                    <Link
                      href="/evenements"
                      className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sauge transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <CalendarRange className="h-4 w-4 text-[#9bb49b]" /> Événements
                    </Link>
                    <div className="border-t border-gray-100 pt-3 mt-1">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ressources</p>
                      <div className="flex flex-col gap-0.5">
                        <Link href="/a-propos" className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1.5" onClick={() => setMobileMenuOpen(false)}>Nos engagements</Link>
                        <Link href="/charte-deontologique" className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1.5" onClick={() => setMobileMenuOpen(false)}>Charte déontologique</Link>
                        <Link href="/a-propos#avis" className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1.5" onClick={() => setMobileMenuOpen(false)}>Vérification des avis</Link>
                        <Link href="/remboursement" className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1.5" onClick={() => setMobileMenuOpen(false)}>Mutuelles</Link>
                        <Link href="/blog" className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1.5" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
                        <Link href="/presse" className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1.5" onClick={() => setMobileMenuOpen(false)}>Presse</Link>
                      </div>
                    </div>
                    {/* Accordéon Besoins */}
                    <div className="border-t border-gray-100 pt-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setMobileBesoinsOpen(!mobileBesoinsOpen)}
                        className="flex items-center justify-between w-full text-left py-1.5"
                      >
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Par besoin (10 sujets)</p>
                        {mobileBesoinsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {mobileBesoinsOpen && (
                        <div className="grid grid-cols-2 gap-0.5 pt-1 pb-2">
                          {SUBJECTS.map((s) => (
                            <Link key={s.slug} href={`/sujet/${s.slug}`} className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1" onClick={() => setMobileMenuOpen(false)}>{s.name}</Link>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Accordéon Métiers */}
                    <div className="border-t border-gray-100 pt-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setMobileMetiersOpen(!mobileMetiersOpen)}
                        className="flex items-center justify-between w-full text-left py-1.5"
                      >
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Par métier (12 professions)</p>
                        {mobileMetiersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {mobileMetiersOpen && (
                        <div className="grid grid-cols-2 gap-0.5 pt-1 pb-2">
                          {PROFESSIONS.map((p) => (
                            <Link key={p.slug} href={`/profession/${p.slug}`} className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1" onClick={() => setMobileMenuOpen(false)}>{p.name}</Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-gray-100 pt-3 mt-1">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Vous êtes praticien ?</p>
                      <div className="flex flex-col gap-0.5">
                        <Link href="/pro" className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1" onClick={() => setMobileMenuOpen(false)}>Logiciel de gestion</Link>
                        <Link href="/aide/pro" className="text-sm font-medium text-anthracite hover:text-sauge transition-colors py-1" onClick={() => setMobileMenuOpen(false)}>Aide & Support</Link>
                      </div>
                    </div>
                  </>
                ) : session.user.role === "ADMIN" ? (
                  <>
                    <Link href="/recherche" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Search className="h-4 w-4 text-[#9bb49b]" /> Recherche
                    </Link>
                    <Link href="/evenements" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <CalendarRange className="h-4 w-4" /> Événements
                    </Link>
                    <Link href="/account/profile" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-4 w-4" /> Mon Profil
                    </Link>
                    <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" /> Dashboard Admin
                    </Link>
                    <Link href="/account/settings" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Settings className="h-4 w-4" /> Paramètres
                    </Link>
                    <div className="border-t border-gray-100 pt-3 mt-2">
                      <button onClick={() => { signOut({ callbackUrl: "/" }); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2 text-left">
                        <LogOut className="h-4 w-4" /> Déconnexion
                      </button>
                    </div>
                  </>
                ) : session.user.role === "PRACTITIONER" ? (
                  <>
                    <Link href="/recherche" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Search className="h-4 w-4 text-[#9bb49b]" /> Recherche
                    </Link>
                    <Link href="/evenements" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <CalendarRange className="h-4 w-4" /> Événements
                    </Link>
                    <Link href="/pro/dashboard" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link href="/pro/calendar" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Calendar className="h-4 w-4" /> Agenda
                    </Link>
                    <Link href="/pro/appointments" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <UserCheck className="h-4 w-4 text-[#9bb49b]" /> RDV
                    </Link>
                    <Link href="/pro/messages" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <MessageSquare className="h-4 w-4" /> Messagerie
                    </Link>
                    <Link href="/pro/events" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <CalendarRange className="h-4 w-4" /> Événements Pro
                    </Link>
                    <Link href="/pro/boutique" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <ShoppingBag className="h-4 w-4" /> Boutique
                    </Link>
                    <Link href="/pro/reviews" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Star className="h-4 w-4" /> Avis
                    </Link>
                    <Link href="/pro/profile" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-4 w-4" /> Mon Profil Public
                    </Link>
                    <Link href="/pro/settings" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Settings className="h-4 w-4" /> Paramètres
                    </Link>
                    <div className="border-t border-gray-100 pt-3 mt-2">
                      <button onClick={() => { signOut({ callbackUrl: "/" }); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2 text-left">
                        <LogOut className="h-4 w-4" /> Déconnexion
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/recherche" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Search className="h-4 w-4 text-[#9bb49b]" /> Recherche
                    </Link>
                    <Link href="/evenements" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <CalendarRange className="h-4 w-4" /> Événements
                    </Link>
                    <Link href="/account/dashboard" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link href="/account/appointments" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <CalendarCheck className="h-4 w-4" /> Mes RDV
                    </Link>
                    <Link href="/account/events" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <CalendarRange className="h-4 w-4" /> Mes Événements
                    </Link>
                    <Link href="/account/reviews" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Star className="h-4 w-4" /> Mes avis
                    </Link>
                    <Link href="/account/favorites" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Heart className="h-4 w-4" /> Mes Favoris
                    </Link>
                    <Link href="/account/messages" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <MessageSquare className="h-4 w-4" /> Mes Messages
                    </Link>
                    <Link href="/account/profile" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-4 w-4" /> Mon Profil
                    </Link>
                    <Link href="/account/settings" className="flex items-center gap-2 text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                      <Settings className="h-4 w-4" /> Paramètres
                    </Link>
                    <div className="border-t border-gray-100 pt-3 mt-2">
                      <button onClick={() => { signOut({ callbackUrl: "/" }); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full text-sm font-medium text-anthracite hover:text-sauge transition-colors py-2 text-left">
                        <LogOut className="h-4 w-4" /> Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </nav>
              {(status === "loading" || status === "unauthenticated" || !session) && (
                <div className="shrink-0 p-4 border-t border-gray-100 bg-white rounded-b-3xl">
                  <div className="flex flex-col gap-2">
                    <Link href="/connexion" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full text-sm py-2">
                        Se connecter
                      </Button>
                    </Link>
                    <Button asChild variant="saugeFill" className="w-full !text-sm" style={{ padding: "0.5rem 1rem", minHeight: "auto" }}>
                      <Link href="/inscription" onClick={() => setMobileMenuOpen(false)}>
                        <span className="relative z-10">S&apos;inscrire</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

