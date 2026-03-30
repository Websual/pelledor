/**
 * Pelledor Block Builder — Types de blocs
 * Chaque bloc = { id, type, config }
 * Format stocké en JSONB dans page_blocks.blocks
 */

export type BlockType =
  | "hero"
  | "heading"
  | "text"
  | "image"
  | "gallery"
  | "cta"
  | "services"
  | "faq"
  | "testimonials"
  | "contact-info"
  | "separator"
  | "embed"
  | "booking-widget"
  | "click-collect-widget"
  | "quote-form"
  | "restaurant-menu";

// ─── Configs par type ─────────────────────────────────────────────────────────

export interface HeadingConfig {
  text: string;
  level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  align?: "left" | "center" | "right";
  /** Classe visuelle optionnelle (ex. plus petit qu’un h1 SEO) */
  size?: "display" | "xl" | "lg" | "md" | "sm";
}

export interface HeroConfig {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  bgImage?: string;
  bgColor?: string;
  textAlign?: "left" | "center" | "right";
  overlay?: number; // 0-100 opacité overlay sombre
}

export interface TextConfig {
  content: string; // HTML safe (riche)
  align?: "left" | "center" | "right";
  maxWidth?: "sm" | "md" | "lg" | "full";
}

export interface ImageConfig {
  src: string;
  alt?: string;
  caption?: string;
  link?: string;
  width?: "sm" | "md" | "lg" | "full";
  rounded?: boolean;
}

export interface GalleryConfig {
  images: { src: string; alt?: string; caption?: string }[];
  columns?: 2 | 3 | 4;
  lightbox?: boolean;
  gap?: "sm" | "md" | "lg";
}

export interface CtaConfig {
  text: string;
  link: string;
  style?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  align?: "left" | "center" | "right";
  subtext?: string;
}

export interface FaqItemConfig {
  question: string;
  answer: string; // HTML léger
}

export interface FaqConfig {
  title?: string;
  items: FaqItemConfig[];
}

export interface TestimonialItemConfig {
  quote: string;
  author: string;
  role?: string;
  avatarUrl?: string;
}

export interface TestimonialsConfig {
  title?: string;
  items: TestimonialItemConfig[];
  columns?: 1 | 2 | 3;
}

export interface ServicesConfig {
  title?: string;
  items: {
    name: string;
    description?: string;
    price?: string;
    duration?: string;
    icon?: string;
  }[];
  columns?: 1 | 2 | 3;
}

export interface ContactInfoConfig {
  title?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  hours?: { label: string; value: string }[];
  showMap?: boolean;
}

export interface SeparatorConfig {
  style?: "line" | "space" | "dots" | "title";
  title?: string;
  spacing?: "sm" | "md" | "lg";
}

export interface EmbedConfig {
  type: "youtube" | "vimeo" | "maps" | "custom";
  url: string;
  height?: number;
  title?: string;
}

export interface BookingWidgetConfig {
  title?: string;
  subtitle?: string;
  establishmentSlug?: string; // si vide = auto depuis context
}

export interface ClickCollectWidgetConfig {
  title?: string;
  subtitle?: string;
  establishmentSlug?: string;
}

export interface QuoteFormConfig {
  title?: string;
  subtitle?: string;
  establishmentSlug?: string;
}

export interface RestaurantMenuConfig {
  title?: string;
  establishmentSlug?: string;
}

// ─── Union type ───────────────────────────────────────────────────────────────

export type BlockConfig =
  | HeroConfig
  | HeadingConfig
  | TextConfig
  | ImageConfig
  | GalleryConfig
  | CtaConfig
  | ServicesConfig
  | FaqConfig
  | TestimonialsConfig
  | ContactInfoConfig
  | SeparatorConfig
  | EmbedConfig
  | BookingWidgetConfig
  | ClickCollectWidgetConfig
  | QuoteFormConfig
  | RestaurantMenuConfig;

export interface PageBlock {
  id: string; // uuid côté client
  type: BlockType;
  config: BlockConfig;
}

// ─── Defaults par type ────────────────────────────────────────────────────────

export const BLOCK_DEFAULTS: Record<BlockType, BlockConfig> = {
  hero: {
    title: "Bienvenue",
    subtitle: "Votre sous-titre ici",
    ctaText: "Prendre RDV",
    ctaLink: "#rdv",
    textAlign: "center",
    overlay: 40,
  } as HeroConfig,
  heading: {
    text: "Titre de section",
    level: "h2",
    align: "left",
    size: "lg",
  } as HeadingConfig,
  text: {
    content: "<p>Votre texte ici...</p>",
    align: "left",
    maxWidth: "md",
  } as TextConfig,
  image: {
    src: "",
    alt: "Image",
    width: "full",
    rounded: false,
  } as ImageConfig,
  gallery: {
    images: [],
    columns: 3,
    lightbox: true,
    gap: "md",
  } as GalleryConfig,
  cta: {
    text: "Contactez-nous",
    link: "#contact",
    style: "primary",
    size: "md",
    align: "center",
  } as CtaConfig,
  services: {
    title: "Nos prestations",
    items: [
      { name: "Prestation 1", price: "50€", duration: "30 min" },
      { name: "Prestation 2", price: "80€", duration: "1h" },
    ],
    columns: 2,
  } as ServicesConfig,
  faq: {
    title: "",
    items: [
      { question: "Première question ?", answer: "<p>Réponse ici.</p>" },
      { question: "Deuxième question ?", answer: "<p>Autre réponse.</p>" },
    ],
  } as FaqConfig,
  testimonials: {
    title: "",
    items: [
      { quote: "Service impeccable, je recommande.", author: "Marie D.", role: "Cliente" },
      { quote: "Professionnels à l’écoute.", author: "Thomas L.", role: "Dirigeant" },
    ],
    columns: 2,
  } as TestimonialsConfig,
  "contact-info": {
    title: "Nous trouver",
    showMap: false,
  } as ContactInfoConfig,
  separator: {
    style: "space",
    spacing: "md",
  } as SeparatorConfig,
  embed: {
    type: "maps",
    url: "",
    height: 400,
  } as EmbedConfig,
  "booking-widget": {
    title: "Prendre rendez-vous",
  } as BookingWidgetConfig,
  "click-collect-widget": {
    title: "Commander à emporter",
  } as ClickCollectWidgetConfig,
  "quote-form": {
    title: "Demander un devis",
  } as QuoteFormConfig,
  "restaurant-menu": {
    title: "Notre carte",
  } as RestaurantMenuConfig,
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero / Bannière",
  heading: "Titre (SEO)",
  text: "Texte riche",
  image: "Image",
  gallery: "Galerie d'images",
  cta: "Bouton d'action",
  services: "Grille de services",
  faq: "FAQ / Accordéon",
  testimonials: "Témoignages",
  "contact-info": "Coordonnées",
  separator: "Séparateur",
  embed: "Vidéo / Carte",
  "booking-widget": "📅 Prise de RDV",
  "click-collect-widget": "🛒 Commander à emporter",
  "quote-form": "📋 Formulaire devis",
  "restaurant-menu": "🍽️ Menu restaurant",
};

export const BLOCK_ICONS: Record<BlockType, string> = {
  hero: "🖼️",
  heading: "H",
  text: "📝",
  image: "🖼️",
  gallery: "🗃️",
  cta: "🔘",
  services: "📋",
  faq: "❓",
  testimonials: "⭐",
  "contact-info": "📍",
  separator: "➖",
  embed: "▶️",
  "booking-widget": "📅",
  "click-collect-widget": "🛒",
  "quote-form": "📋",
  "restaurant-menu": "🍽️",
};
