import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

export type MiddlewareContext = {
  request: NextRequest;
  auth: Session | null;
};

/**
 * Une regle retourne une Response pour court-circuiter, ou null pour continuer.
 * Ordre = ordre d execution (comme une pile de modules).
 */
export type MiddlewareRule = (
  ctx: MiddlewareContext
) => NextResponse | null | Promise<NextResponse | null>;

/**
 * Installation (utilisee aussi dans preInstallMiddleware).
 * null = continuer la chaine ; sinon Response.
 */
export const installRule: MiddlewareRule = ({ request }) => {
  const installed = process.env.SAAS_INSTALLED === "true";
  const path = request.nextUrl.pathname;

  if (path.startsWith("/install")) {
    if (installed) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (!installed) {
    return NextResponse.redirect(new URL("/install", request.url));
  }
  return null;
};

/** Admin : session requise */
export const adminAuthRule: MiddlewareRule = ({ request, auth }) => {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/admin")) return null;
  if (auth?.user) return null;
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", path);
  return NextResponse.redirect(login);
};

/** Regles apres install (auth deja resolu). Ajouter ici les regles modules (Stripe, etc.). */
export const postInstallRules: MiddlewareRule[] = [adminAuthRule];
