import { getThemeTokensResolved } from "@/core/theme/db";
import { tokensToCssVariables } from "@/core/theme/types";

function fontHref(tokens: { fonts: { sans: string; heading: string } }): string | null {
  const families = new Set<string>();
  const pick = (s: string) => {
    const m = s.match(/["']?([^"',]+)["']?/);
    if (m && !m[1].includes("system") && !m[1].includes("ui-")) {
      const name = m[1].trim();
      if (name.length > 2 && !name.includes("sans-serif"))
        families.add(name.replace(/\s+/g, "+"));
    }
  };
  pick(tokens.fonts.sans);
  pick(tokens.fonts.heading);
  if (families.size === 0) return null;
  return `https://fonts.googleapis.com/css2?${[...families].map((f) => `family=${f}:wght@400;600;700`).join("&")}&display=swap`;
}

export async function ThemeStyle() {
  let css = "";
  let href: string | null = null;
  try {
    const t = await getThemeTokensResolved();
    css = `:root { ${tokensToCssVariables(t)} }`;
    href = fontHref(t);
  } catch {
    css = "";
  }
  return (
    <>
      {href ? <link rel="stylesheet" href={href} /> : null}
      {css ? (
        <style
          id="saas-theme-tokens"
          dangerouslySetInnerHTML={{ __html: css }}
        />
      ) : null}
    </>
  );
}
