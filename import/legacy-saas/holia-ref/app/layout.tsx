import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { FloatingNavbar } from "@/components/floating-navbar";
import { Footer } from "@/components/footer";
import { ClaimRedirect } from "@/components/claim-redirect";
import { NavbarWrapper } from "@/components/navbar-wrapper";
import { ConditionalFooter } from "@/components/conditional-footer";
import { SmoothScroll } from "@/components/providers/SmoothScroll";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

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
  authors: [{ name: "Holia" }],
  creator: "Holia",
  publisher: "Holia",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://holia.me"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    title: "Holia | Bien-être Local & Holistique",
    description:
      "Connectez-vous à une communauté bien-être authentique. Holia vous met en relation avec praticiens certifiés spécialisés en bien-être holistique.",
    siteName: "Holia",
  },
  twitter: {
    card: "summary_large_image",
    title: "Holia | Bien-être Local & Holistique",
    description:
      "Connectez-vous à une communauté bien-être authentique. Holia vous met en relation avec praticiens certifiés spécialisés en bien-être holistique.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${manrope.variable}`}>
      <body className={inter.className}>
        <Providers>
          <SmoothScroll>
            <NavbarWrapper />
            <ClaimRedirect />
            {children}
          </SmoothScroll>
        </Providers>
        <ConditionalFooter />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5132226059892334"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}

