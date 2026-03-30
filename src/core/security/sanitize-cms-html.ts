import sanitizeHtml from "sanitize-html";

const CMS_RICH_TEXT: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "blockquote",
    "pre",
    "code",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "hr",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "div",
    "span",
    "figure",
    "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    img: ["src", "alt", "width", "height", "loading", "title"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName: string, attribs: Record<string, string>) => {
      const next = { ...attribs };
      if (next.target === "_blank") {
        next.rel = "noopener noreferrer";
      }
      return { tagName, attribs: next };
    },
  },
};

/** HTML stocké côté CMS (articles, blocs texte / FAQ) — neutralise scripts et attributs dangereux. */
export function sanitizeCmsHtml(html: string): string {
  if (!html?.trim()) return "";
  return sanitizeHtml(html, CMS_RICH_TEXT);
}
