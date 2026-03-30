import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

function isInstallPath(pathname: string): boolean {
  return pathname === "/install" || pathname.startsWith("/install/");
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function preInstallMiddleware(request: NextRequest) {
  const installed = process.env.SAAS_INSTALLED === "true";
  const path = request.nextUrl.pathname;
  if (isInstallPath(path)) {
    if (installed) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }
  if (!installed) {
    const install = request.nextUrl.clone();
    install.pathname = "/install";
    install.search = "";
    return NextResponse.redirect(install);
  }
  return NextResponse.next();
}

function sessionFromToken(
  token: Record<string, unknown> | null
): Session | null {
  if (!token?.sub || typeof token.sub !== "string") return null;
  const exp =
    typeof token.exp === "number" ? token.exp : Math.floor(Date.now() / 1000) + 86400;
  return {
    expires: new Date(exp * 1000).toISOString(),
    user: {
      id: token.sub,
      email: (token.email as string) ?? "",
      role: (token.role as string) ?? "admin",
    },
  };
}

export default async function middleware(request: NextRequest) {
  if (process.env.SAAS_INSTALLED !== "true") {
    return preInstallMiddleware(request);
  }

  const path = request.nextUrl.pathname;
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production" && isAdminPath(path)) {
      return new NextResponse(
        "Configuration serveur : AUTH_SECRET manquant.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }
    return NextResponse.next();
  }
  const token = await getToken({
    req: request,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });
  const session = sessionFromToken(
    token && typeof token === "object" ? (token as Record<string, unknown>) : null
  );

  if (isInstallPath(path)) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  if (isAdminPath(path) && !session) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
