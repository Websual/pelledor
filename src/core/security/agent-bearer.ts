import { timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners } from "@/core/db/schema.modules";
import type { Session } from "next-auth";
import { eq } from "drizzle-orm";

const MIN_AGENT_TOKEN_BYTES = 32;

export type PractitionerRow = typeof practitioners.$inferSelect;

export type CmsApiAuthOk = {
  ok: true;
  practitioner: PractitionerRow;
  session: Session | null;
  isAgent: boolean;
  /** POST cms-bundle : fusion thème globale (désactivé par défaut pour l’agent). */
  agentCanEditTheme: boolean;
};

export type CmsApiAuthFail = {
  ok: false;
  error: string;
  status: number;
};

export type CmsApiAuth = CmsApiAuthOk | CmsApiAuthFail;

function tokensEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Auth pour automates : `Authorization: Bearer <PELLEDOR_AGENT_TOKEN>`,
 * avec périmètre limité au praticien `PELLEDOR_AGENT_PRACTITIONER_ID`.
 * Sinon session NextAuth (comportement habituel).
 */
export async function requirePractitionerForCmsApi(req: Request): Promise<CmsApiAuth> {
  const raw = req.headers.get("authorization");
  const bearer = raw?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const agentSecret = process.env.PELLEDOR_AGENT_TOKEN?.trim() ?? "";
  const agentPid = process.env.PELLEDOR_AGENT_PRACTITIONER_ID?.trim() ?? "";

  if (bearer) {
    if (
      agentSecret &&
      agentSecret.length < MIN_AGENT_TOKEN_BYTES
    ) {
      return {
        ok: false,
        error: "PELLEDOR_AGENT_TOKEN trop court (min. 32 caractères)",
        status: 503,
      };
    }
    if (!agentSecret || !tokensEqual(bearer, agentSecret)) {
      return { ok: false, error: "Unauthorized", status: 401 };
    }
    if (!agentPid) {
      return {
        ok: false,
        error: "PELLEDOR_AGENT_PRACTITIONER_ID manquant côté serveur",
        status: 503,
      };
    }
    const db = getDb();
    const practitioner = await db.query.practitioners.findFirst({
      where: eq(practitioners.id, agentPid),
    });
    if (!practitioner) {
      return { ok: false, error: "Praticien agent introuvable", status: 404 };
    }
    const agentCanEditTheme = process.env.PELLEDOR_AGENT_ALLOW_THEME === "true";
    return {
      ok: true,
      practitioner,
      session: null,
      isAgent: true,
      agentCanEditTheme,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }
  const db = getDb();
  const practitioner = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!practitioner) {
    return { ok: false, error: "Praticien introuvable", status: 404 };
  }
  return {
    ok: true,
    practitioner,
    session,
    isAgent: false,
    agentCanEditTheme: false,
  };
}

export function canSaveGlobalTheme(authz: CmsApiAuthOk): boolean {
  if (authz.isAgent) return authz.agentCanEditTheme;
  return authz.session?.user?.role === "admin";
}
