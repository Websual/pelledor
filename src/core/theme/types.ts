/**
 * Tokens persistes en JSON ; fusion avec defaults pour CSS variables.
 */
export type ThemeTokens = {
  colors: {
    primary: string;
    primaryForeground: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    success: string;
    error: string;
  };
  fonts: {
    sans: string;
    heading: string;
  };
  spacing: {
    baseRem: number;
    scale: number;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  interactive: {
    focusRing: string;
    focusRingWidth: string;
    hoverOpacity: number;
    disabledOpacity: number;
  };
};

export const defaultThemeTokens: ThemeTokens = {
  colors: {
    primary: "#171717",
    primaryForeground: "#fafafa",
    background: "#fafafa",
    foreground: "#0a0a0a",
    muted: "#737373",
    border: "#e5e5e5",
    success: "#15803d",
    error: "#b91c1c",
  },
  fonts: {
    sans: "ui-sans-serif, system-ui, sans-serif",
    heading: "ui-sans-serif, system-ui, sans-serif",
  },
  spacing: {
    baseRem: 0.25,
    scale: 1.25,
  },
  radius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
  },
  interactive: {
    focusRing: "#3b82f6",
    focusRingWidth: "2px",
    hoverOpacity: 0.92,
    disabledOpacity: 0.5,
  },
};

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Partial<{ [K in keyof T]: unknown }>
): T {
  const out = { ...base } as T;
  for (const k of Object.keys(patch) as (keyof T)[]) {
    const pv = patch[k];
    const bv = base[k];
    if (
      pv &&
      typeof pv === "object" &&
      !Array.isArray(pv) &&
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      (out as Record<string, unknown>)[k as string] = deepMerge(
        bv as Record<string, unknown>,
        pv as Record<string, unknown>
      );
    } else if (pv !== undefined) {
      (out as Record<string, unknown>)[k as string] = pv;
    }
  }
  return out;
}

export function mergeThemeTokens(
  stored: Partial<ThemeTokens> | Record<string, unknown> | null
): ThemeTokens {
  if (!stored || typeof stored !== "object") return { ...defaultThemeTokens };
  return deepMerge(
    defaultThemeTokens,
    stored as Partial<ThemeTokens>
  ) as ThemeTokens;
}

export function tokensToCssVariables(t: ThemeTokens): string {
  const { colors, fonts, spacing, radius, interactive } = t;
  return `
    --color-primary: ${colors.primary};
    --color-primary-foreground: ${colors.primaryForeground};
    --color-background: ${colors.background};
    --color-foreground: ${colors.foreground};
    --color-muted: ${colors.muted};
    --color-border: ${colors.border};
    --color-success: ${colors.success};
    --color-error: ${colors.error};
    --font-sans: ${fonts.sans};
    --font-heading: ${fonts.heading};
    --space-base: ${spacing.baseRem}rem;
    --radius-sm: ${radius.sm};
    --radius-md: ${radius.md};
    --radius-lg: ${radius.lg};
    --focus-ring: ${interactive.focusRing};
    --focus-ring-width: ${interactive.focusRingWidth};
    --hover-opacity: ${interactive.hoverOpacity};
    --disabled-opacity: ${interactive.disabledOpacity};
  `
    .replace(/\s+/g, " ")
    .trim();
}
