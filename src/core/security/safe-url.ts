/** Liens `<a href>` : http(s), chemins relatifs sûrs, mailto, tel. */
export function safeHref(href: string | undefined): string {
  if (!href?.trim()) return "#";
  const h = href.trim();
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  const lower = h.toLowerCase();
  if (lower.startsWith("mailto:")) {
    const rest = h.slice(7);
    if (rest.length > 512 || /[\s<>"]/.test(rest)) return "#";
    return h;
  }
  if (lower.startsWith("tel:")) {
    const rest = h.slice(4);
    if (!/^[\d+().\s\-]{3,32}$/.test(rest)) return "#";
    return h;
  }
  try {
    const u = new URL(h);
    if (u.protocol === "https:" || u.protocol === "http:") return h;
  } catch {
    /* ignore */
  }
  return "#";
}

/** `src` d’images : http(s), chemin absolu local, ou data:image (SVG exclu : XSS). */
export function safeImageSrc(src: string | undefined): string | undefined {
  if (!src?.trim()) return undefined;
  const s = src.trim();
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (s.toLowerCase().startsWith("data:image/")) {
    if (s.toLowerCase().includes("svg")) return undefined;
    return s.length <= 2_000_000 ? s : undefined;
  }
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return s;
  } catch {
    /* ignore */
  }
  return undefined;
}

/** URL pour CSS `background: url(...)` — pas de `javascript:` ni `data:` risqués. */
export function safeCssBackgroundUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const s = url.trim();
  if (/^(javascript|data|vbscript):/i.test(s)) return undefined;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return s;
  } catch {
    /* ignore */
  }
  return undefined;
}
