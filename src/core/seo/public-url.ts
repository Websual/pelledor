import { APP_BASE_PATH } from "./constants";

/** Origine publique (sans slash final). */
export function getPublicOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (fromEnv) return fromEnv;
  const v = process.env.VERCEL_URL?.replace(/\/$/, "").trim();
  if (v) return v.startsWith("http") ? v : `https://${v}`;
  return "";
}

/** Base pour `metadata` Next (résolution des URLs relatives). */
export function getMetadataBase(): URL {
  const origin = getPublicOrigin() || "http://localhost:3000";
  return new URL(`${origin}${APP_BASE_PATH}/`);
}

/** URL absolue vers une ressource du site vitrine (chemins à partir de `/site/...`). */
export function absoluteSiteUrl(establishment: string, ...pathSegments: string[]): string {
  const origin = getPublicOrigin() || "http://localhost:3000";
  const path = ["/site", establishment, ...pathSegments].join("/");
  return `${origin}${APP_BASE_PATH}${path}`;
}
