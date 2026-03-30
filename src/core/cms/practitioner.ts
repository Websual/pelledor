import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners } from "@/core/db/schema.modules";
import {
  requirePractitionerForCmsApi,
  type CmsApiAuthOk,
  type PractitionerRow,
} from "@/core/security/agent-bearer";
import { eq } from "drizzle-orm";

/** Session navigateur ou jeton agent Bearer (voir `docs/openapi/`). */
export async function getPractitionerForApi(
  req: Request
): Promise<
  | { practitioner: PractitionerRow; authz: CmsApiAuthOk }
  | { error: string; status: number }
> {
  const r = await requirePractitionerForCmsApi(req);
  if (!r.ok) return { error: r.error, status: r.status };
  return { practitioner: r.practitioner, authz: r };
}

export async function getPractitionerForSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" as const, practitioner: undefined };
  }
  const db = getDb();
  const practitioner = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!practitioner) {
    return { error: "Praticien introuvable" as const, practitioner: undefined };
  }
  return { practitioner, error: undefined };
}
