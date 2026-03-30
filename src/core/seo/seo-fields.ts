export type PageSeoColumns = {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
  targetKeyword: string | null;
};

function strOrNull(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

/** Champs SEO pour une création CMS / première sauvegarde. */
export function seoFromBodyForInsert(body: Record<string, unknown>): PageSeoColumns {
  return {
    metaTitle: strOrNull(body.metaTitle, 512),
    metaDescription: strOrNull(body.metaDescription, 8000),
    canonicalUrl: strOrNull(body.canonicalUrl, 2048),
    ogTitle: strOrNull(body.ogTitle, 512),
    ogDescription: strOrNull(body.ogDescription, 8000),
    ogImageUrl: strOrNull(body.ogImageUrl, 2048),
    noindex: body.noindex === true,
    targetKeyword: strOrNull(body.targetKeyword, 255),
  };
}

/** Fusion page builder : chaque clé absente du body conserve la valeur existante. */
export function mergePageBlockSeo(
  body: Record<string, unknown>,
  existing: Partial<PageSeoColumns> | null | undefined
): PageSeoColumns {
  const ex = existing ?? {};
  return {
    metaTitle:
      "metaTitle" in body ? strOrNull(body.metaTitle, 512) : (ex.metaTitle ?? null),
    metaDescription:
      "metaDescription" in body
        ? strOrNull(body.metaDescription, 8000)
        : (ex.metaDescription ?? null),
    canonicalUrl:
      "canonicalUrl" in body
        ? strOrNull(body.canonicalUrl, 2048)
        : (ex.canonicalUrl ?? null),
    ogTitle: "ogTitle" in body ? strOrNull(body.ogTitle, 512) : (ex.ogTitle ?? null),
    ogDescription:
      "ogDescription" in body
        ? strOrNull(body.ogDescription, 8000)
        : (ex.ogDescription ?? null),
    ogImageUrl:
      "ogImageUrl" in body
        ? strOrNull(body.ogImageUrl, 2048)
        : (ex.ogImageUrl ?? null),
    noindex: "noindex" in body ? body.noindex === true : (ex.noindex ?? false),
    targetKeyword:
      "targetKeyword" in body
        ? strOrNull(body.targetKeyword, 255)
        : (ex.targetKeyword ?? null),
  };
}

export function seoPatchFromBody(
  body: Record<string, unknown>,
  existing: PageSeoColumns
): Partial<PageSeoColumns> {
  const o: Partial<PageSeoColumns> = {};
  if ("metaTitle" in body) o.metaTitle = strOrNull(body.metaTitle, 512);
  if ("metaDescription" in body)
    o.metaDescription = strOrNull(body.metaDescription, 8000);
  if ("canonicalUrl" in body) o.canonicalUrl = strOrNull(body.canonicalUrl, 2048);
  if ("ogTitle" in body) o.ogTitle = strOrNull(body.ogTitle, 512);
  if ("ogDescription" in body)
    o.ogDescription = strOrNull(body.ogDescription, 8000);
  if ("ogImageUrl" in body) o.ogImageUrl = strOrNull(body.ogImageUrl, 2048);
  if ("noindex" in body) o.noindex = body.noindex === true;
  if ("targetKeyword" in body)
    o.targetKeyword = strOrNull(body.targetKeyword, 255);
  return Object.keys(o).length ? o : {};
}
