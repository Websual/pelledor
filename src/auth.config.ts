import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/core/db/server";
import { users } from "@/core/db/schema";
import { rateLimitMemory } from "@/core/security/rate-limit-memory";

const isProd = process.env.NODE_ENV === "production";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  basePath: "/api/auth",
  useSecureCookies: isProd,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/",
      },
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const h = await headers();
        const ip =
          h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          h.get("x-real-ip")?.trim() ??
          "unknown";
        if (!rateLimitMemory(`login:ip:${ip}`, 40, 15 * 60 * 1000)) {
          return null;
        }
        const email = String(creds.email).toLowerCase().trim();
        if (!rateLimitMemory(`login:email:${email}`, 12, 15 * 60 * 1000)) {
          return null;
        }
        const db = getDb();
        const row = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!row) return null;
        const ok = await compare(String(creds.password), row.passwordHash);
        if (!ok) return null;
        return {
          id: row.id,
          email: row.email,
          role: row.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.role = (user as { role?: string }).role ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = token.email ?? "";
        session.user.role = (token.role as string) ?? "admin";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
