import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import {
  anamneseForms,
  anamneseResponses,
  practitioners,
} from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function formOwnedByUser(formId: string, userId: string) {
  const db = getDb();
  const form = await db.query.anamneseForms.findFirst({
    where: eq(anamneseForms.id, formId),
  });
  if (!form) return null;
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.id, form.practitionerId),
  });
  return p?.userId === userId ? form : null;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const form =
    session.user.role === "admin"
      ? await getDb().query.anamneseForms.findFirst({
          where: eq(anamneseForms.id, id),
        })
      : await formOwnedByUser(id, session.user.id);
  if (!form) return NextResponse.json({ error: "Formulaire introuvable" }, { status: 404 });
  const db = getDb();
  const responses = await db
    .select()
    .from(anamneseResponses)
    .where(eq(anamneseResponses.formId, id));
  return NextResponse.json({ form, responses });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const owned =
    session.user.role === "admin"
      ? await getDb().query.anamneseForms.findFirst({
          where: eq(anamneseForms.id, id),
        })
      : await formOwnedByUser(id, session.user.id);
  if (!owned)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const updates: Record<string, unknown> = {};
  if (body.title) updates.title = String(body.title).trim().slice(0, 512);
  if (Array.isArray(body.fields)) updates.fields = body.fields;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
  await db.update(anamneseForms).set(updates).where(eq(anamneseForms.id, id));
  return NextResponse.json({ ok: true });
}
