import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/core/db/server";
import { siteNavItems } from "@/core/db/schema.modules";
import { getPractitionerForSession } from "@/core/cms/practitioner";
import { isNavLinkType } from "@/core/cms/practitioner-utils";

export async function GET() {
  const { practitioner, error } = await getPractitionerForSession();
  if (error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Praticien introuvable") {
    return NextResponse.json({ items: [], noPractitioner: true });
  }
  const db = getDb();
  const items = await db
    .select()
    .from(siteNavItems)
    .where(eq(siteNavItems.practitionerId, practitioner!.id))
    .orderBy(asc(siteNavItems.sortOrder), asc(siteNavItems.createdAt));
  return NextResponse.json({ items });
}

type NavItemIn = {
  label?: string;
  linkType?: string;
  linkTarget?: string;
  sortOrder?: number;
};

export async function POST(req: Request) {
  const { practitioner, error } = await getPractitionerForSession();
  if (error) {
    return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 404 });
  }
  const body = await req.json().catch(() => ({}));
  const rawItems = body.items;
  if (!Array.isArray(rawItems)) {
    return NextResponse.json({ error: "items[] requis" }, { status: 400 });
  }

  const rows: {
    practitionerId: string;
    sortOrder: number;
    label: string;
    linkType: string;
    linkTarget: string;
  }[] = [];

  rawItems.forEach((it: NavItemIn, i: number) => {
    const label = String(it.label ?? "").trim().slice(0, 255);
    if (!label) return;
    const lt = String(it.linkType ?? "page");
    if (!isNavLinkType(lt)) return;
    rows.push({
      practitionerId: practitioner!.id,
      sortOrder: Number.isFinite(it.sortOrder) ? Number(it.sortOrder) : i,
      label,
      linkType: lt,
      linkTarget: String(it.linkTarget ?? "").slice(0, 512),
    });
  });

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .delete(siteNavItems)
      .where(eq(siteNavItems.practitionerId, practitioner!.id));
    if (rows.length) {
      await tx.insert(siteNavItems).values(rows);
    }
  });

  const items = await db
    .select()
    .from(siteNavItems)
    .where(eq(siteNavItems.practitionerId, practitioner!.id))
    .orderBy(asc(siteNavItems.sortOrder), asc(siteNavItems.createdAt));
  return NextResponse.json({ ok: true, items });
}
