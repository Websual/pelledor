import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { practitioners } from "@/core/db/schema.modules";
import { rateLimitMemory } from "@/core/security/rate-limit-memory";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimitMemory(`practitioner-seo:${session.user.id}`, 120, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!p) {
    return NextResponse.json({
      publicSiteUrl: "",
      seoRobotsTxt: "",
      noPractitioner: true,
    });
  }
  return NextResponse.json({
    publicSiteUrl: p.publicSiteUrl ?? "",
    seoRobotsTxt: p.seoRobotsTxt ?? "",
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimitMemory(`practitioner-seo:${session.user.id}`, 120, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  const p = await db.query.practitioners.findFirst({
    where: eq(practitioners.userId, session.user.id),
  });
  if (!p) return NextResponse.json({ error: "Praticien introuvable" }, { status: 404 });

  const publicSiteUrl =
    body.publicSiteUrl !== undefined
      ? String(body.publicSiteUrl).trim().slice(0, 2048) || null
      : p.publicSiteUrl;
  const seoRobotsTxt =
    body.seoRobotsTxt !== undefined
      ? String(body.seoRobotsTxt).trim()
        ? String(body.seoRobotsTxt).slice(0, 16000)
        : null
      : p.seoRobotsTxt;

  const [row] = await db
    .update(practitioners)
    .set({
      publicSiteUrl: publicSiteUrl ?? null,
      seoRobotsTxt: seoRobotsTxt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(practitioners.id, p.id))
    .returning({
      publicSiteUrl: practitioners.publicSiteUrl,
      seoRobotsTxt: practitioners.seoRobotsTxt,
    });

  return NextResponse.json({ ok: true, ...row });
}
