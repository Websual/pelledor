import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

function preInstallMiddleware(request: NextRequest) {
  const installed = process.env.SAAS_INSTALLED === "true";
  const path = request.nextUrl.pathname;
  // Support both /install and /saas-os/install (basePath prefix)
  const isInstallPath = path.startsWith("/install") || path.includes("/saas-os/install");
  if (isInstallPath) {
    if (installed) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (!installed) {
    return NextResponse.redirect(new URL("/install", request.url));
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
  if (!secret) return NextResponse.next();
  const token = await getToken({
    req: request,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });
  const session = sessionFromToken(
    token && typeof token === "object" ? (token as Record<string, unknown>) : null
  );

  if (path.startsWith("/install") || path.includes("/saas-os/install")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (path.startsWith("/admin") && !session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|install|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
