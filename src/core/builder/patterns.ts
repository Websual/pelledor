import type { PageBlock } from "./block-types";
import { BLOCK_DEFAULTS } from "./block-types";

function newBlockId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function block(type: PageBlock["type"], configPatch?: Partial<PageBlock["config"]>): PageBlock {
  const def = BLOCK_DEFAULTS[type] as object;
  return {
    id: newBlockId(),
    type,
    config: { ...def, ...(configPatch as object) } as PageBlock["config"],
  };
}

export type PatternDefinition = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

export const PATTERN_DEFINITIONS: PatternDefinition[] = [
  {
    id: "hero-strip",
    label: "Hero + séparateur",
    description: "Grande bannière puis léger espacement",
    icon: "🦸",
  },
  {
    id: "services-section",
    label: "Section services",
    description: "Titre + grille de prestations",
    icon: "📋",
  },
  {
    id: "faq-section",
    label: "FAQ accordéon",
    description: "Titre + questions fréquentes",
    icon: "❓",
  },
  {
    id: "cta-band",
    label: "Bandeau CTA",
    description: "Séparateur, bouton d’action, séparateur",
    icon: "📣",
  },
  {
    id: "testimonials-section",
    label: "Témoignages",
    description: "Titre + citations clients",
    icon: "⭐",
  },
];

export function getPatternBlocks(patternId: string): PageBlock[] {
  switch (patternId) {
    case "hero-strip":
      return [
        block("hero", {
          title: "Votre accroche principale",
          subtitle: "Une phrase qui résume votre valeur",
        }),
        block("separator", { style: "space", spacing: "md" }),
      ];
    case "services-section":
      return [
        block("heading", {
          text: "Nos services",
          level: "h2",
          align: "center",
        }),
        block("services"),
      ];
    case "faq-section":
      return [
        block("heading", {
          text: "Questions fréquentes",
          level: "h2",
          align: "center",
        }),
        block("faq"),
      ];
    case "cta-band":
      return [
        block("separator", { style: "line", spacing: "sm" }),
        block("cta", {
          text: "Nous contacter",
          link: "#contact",
          align: "center",
          subtext: "Réponse sous 24h",
        }),
        block("separator", { style: "line", spacing: "sm" }),
      ];
    case "testimonials-section":
      return [
        block("heading", {
          text: "Ils nous font confiance",
          level: "h2",
          align: "center",
        }),
        block("testimonials"),
      ];
    default:
      return [];
  }
}
