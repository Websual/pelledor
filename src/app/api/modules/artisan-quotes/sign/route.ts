import { getDb } from "@/core/db/server";
import { quoteRequests, practitioners, notifications } from "@/core/db/schema.modules";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const signatureData = String(body.signatureData ?? "").trim();
  if (!token || !signatureData)
    return NextResponse.json({ error: "Token et signature requis" }, { status: 400 });

  const db = getDb();
  const quote = await db.query.quoteRequests.findFirst({
    where: eq(quoteRequests.publicToken, token),
  });
  if (!quote) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  if (quote.signedAt) return NextResponse.json({ error: "Devis déjà signé" }, { status: 409 });

  await db
    .update(quoteRequests)
    .set({ signedAt: new Date(), signatureData, status: "accepted" })
    .where(eq(quoteRequests.publicToken, token));

  // Notifier l'artisan
  const practitioner = await db.query.practitioners.findFirst({
    where: (p, { eq: eqFn }) => eqFn(p.id, quote.practitionerId),
  });
  if (practitioner?.userId) {
    await db.insert(notifications).values({
      userId: practitioner.userId,
      type: "QUOTE_SIGNED",
      title: "Devis signé !",
      message: `${quote.clientName} a signé et accepté votre devis.`,
      link: "/admin/devis",
    });
  }

  return NextResponse.json({ ok: true });
}
