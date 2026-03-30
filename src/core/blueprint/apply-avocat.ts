import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getDb } from "@/core/db/server";
import { appSettings } from "@/core/db/schema";
import {
  practitioners,
  professions,
  services,
  workingHours,
} from "@/core/db/schema.modules";
import { setModuleToggle } from "@/core/theme/db";
import { eq } from "drizzle-orm";

const ON = [
  "notes",
  "stripe",
  "directory",
  "booking",
  "billing",
  "chat",
  "notifications",
  "artisan-quotes",
];
const OFF = ["lodging", "restaurant", "events", "blog", "gift-cards", "shop"];

export async function applyAvocatToggles() {
  for (const s of ON) await setModuleToggle(s, true);
  for (const s of OFF) await setModuleToggle(s, false);
}

export async function seedAvocat(adminUserId: string) {
  const db = getDb();
  let pid: string;
  const ex = await db
    .select({ id: practitioners.id })
    .from(practitioners)
    .where(eq(practitioners.userId, adminUserId))
    .limit(1);
  if (ex.length) {
    pid = ex[0].id;
  } else {
    let profId: string | null = null;
    const ep = await db
      .select({ id: professions.id })
      .from(professions)
      .where(eq(professions.slug, "cabinet-avocat"))
      .limit(1);
    if (ep.length) profId = ep[0].id;
    else {
      const [pr] = await db
        .insert(professions)
        .values({
          name: "Cabinet d'avocat",
          slug: "cabinet-avocat",
          description: "Blueprint avocat (RDV, honoraires, devis)",
        })
        .returning({ id: professions.id });
      profId = pr?.id ?? null;
    }
    if (!profId) throw new Error("profession");
    const [p] = await db
      .insert(practitioners)
      .values({
        userId: adminUserId,
        professionId: profId,
        slug: "mon-avocat",
        title: "Durand Avocats",
        bio: "Consultations sur rendez-vous. Accompagnement en conseil et contentieux.",
        city: "Paris",
        isActive: true,
      })
      .returning({ id: practitioners.id });
    if (!p) throw new Error("practitioner");
    pid = p.id;

    const svcCount = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.practitionerId, pid));
    if (svcCount.length === 0) {
      await db.insert(services).values([
        {
          practitionerId: pid,
          name: "Consultation initiale",
          durationMin: 60,
          priceCents: 15000,
          description: "Premier entretien et stratégie de dossier",
        },
        {
          practitionerId: pid,
          name: "Rendez-vous de suivi",
          durationMin: 45,
          priceCents: 10000,
          description: "Suivi de procédure et actions à mener",
        },
        {
          practitionerId: pid,
          name: "Consultation urgente",
          durationMin: 60,
          priceCents: 20000,
          description: "Traitement prioritaire sous 24h",
        },
      ]);
    }
    const whCount = await db
      .select({ id: workingHours.id })
      .from(workingHours)
      .where(eq(workingHours.practitionerId, pid));
    if (whCount.length === 0) {
      for (let d = 1; d <= 5; d++) {
        await db.insert(workingHours).values({
          practitionerId: pid,
          dayOfWeek: d,
          startTime: "09:00",
          endTime: "18:00",
          isActive: true,
        });
      }
    }
  }

  await db
    .insert(appSettings)
    .values({ key: "blueprint.active", value: "avocat" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "avocat", updatedAt: new Date() },
    });

  const j = JSON.parse(
    readFileSync(
      join(process.cwd(), "content/blueprints/avocat/saas-modules.json"),
      "utf8"
    )
  ) as { modules: string[] };
  writeFileSync(
    join(process.cwd(), "saas-modules.json"),
    JSON.stringify({ modules: j.modules }, null, 2) + "\n"
  );

  return {
    slug: "mon-avocat",
    message:
      "Blueprint avocat activé. Modules RDV/facturation/devis + seed mon-avocat.",
  };
}
