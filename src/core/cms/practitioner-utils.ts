/** Utilitaires CMS sans dépendance serveur — importables côté client. */

export function slugify(input: string, maxLen = 160): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
}

export const NAV_LINK_TYPES = [
  "page",
  "external",
  "blog",
  "portfolio",
  "blog_category",
] as const;
export type NavLinkType = (typeof NAV_LINK_TYPES)[number];

export function isNavLinkType(s: string): s is NavLinkType {
  return (NAV_LINK_TYPES as readonly string[]).includes(s);
}
