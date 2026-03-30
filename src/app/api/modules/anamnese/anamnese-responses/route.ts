import { getDb } from "@/core/db/server";
import { anamneseForms, anamneseResponses, notifications } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const formId = String(body.formId ?? "").trim();
  const patientName = String(body.patientName ?? "").trim();
  const patientEmail = String(body.patientEmail ?? "").trim();
  const answers = typeof body.answers === "object" ? body.answers : {};
  const appointmentId = body.appointmentId ? String(body.appointmentId) : null;

  if (!formId || !patientName || !patientEmail.includes("@"))
    return NextResponse.json({ error: "Champs requis" }, { status: 400 });

  const db = getDb();
  const form = await db.query.anamneseForms.findFirst({
    where: eq(anamneseForms.id, formId),
  });
  if (!form) return NextResponse.json({ error: "Formulaire introuvable" }, { status: 404 });

  const [row] = await db
    .insert(anamneseResponses)
    .values({
      formId,
      appointmentId,
      patientName: patientName.slice(0, 255),
      patientEmail: patientEmail.slice(0, 255),
      answers,
    })
    .returning();

  // Notifier le praticien
  const practitioner = await db.query.practitioners.findFirst({
    where: (p, { eq: eqFn }) => eqFn(p.id, form.practitionerId),
  });
  if (practitioner?.userId) {
    await db.insert(notifications).values({
      userId: practitioner.userId,
      type: "ANAMNESE_RECEIVED",
      title: "Nouveau formulaire d'anamnèse reçu",
      message: `${patientName} a rempli le formulaire "${form.title}"`,
      link: `/admin/anamnese`,
    });
  }

  return NextResponse.json({ ok: true, id: row.id });
}
