import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { anamneseForms, anamneseResponses } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const form = await db.query.anamneseForms.findFirst({
    where: eq(anamneseForms.id, id),
  });
  if (!form) return NextResponse.json({ error: "Formulaire introuvable" }, { status: 404 });
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
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const updates: Record<string, unknown> = {};
  if (body.title) updates.title = String(body.title).trim().slice(0, 512);
  if (Array.isArray(body.fields)) updates.fields = body.fields;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
  await db.update(anamneseForms).set(updates).where(eq(anamneseForms.id, id));
  return NextResponse.json({ ok: true });
}
