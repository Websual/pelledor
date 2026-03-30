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
];
const OFF = [
  "lodging",
  "restaurant",
  "events",
  "blog",
  "gift-cards",
  "artisan-quotes",
];

export async function applyCabinetToggles() {
  for (const s of ON) await setModuleToggle(s, true);
  for (const s of OFF) await setModuleToggle(s, false);
}

export async function seedCabinet(adminUserId: string) {
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
      .where(eq(professions.slug, "cabinet-conseil"))
      .limit(1);
    if (ep.length) profId = ep[0].id;
    else {
      const [pr] = await db
        .insert(professions)
        .values({
          name: "Cabinet conseil / juridique",
          slug: "cabinet-conseil",
          description: "Blueprint cabinet (RDV, facturation)",
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
        slug: "mon-cabinet",
        title: "Bernard & Associés",
        bio: "Première consultation sur rendez-vous. Droit des affaires et contentieux.",
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
          priceCents: 25000,
          description: "Analyse de situation et premiers conseils",
        },
        {
          practitionerId: pid,
          name: "Rédaction / relecture contrat",
          durationMin: 60,
          priceCents: 0,
          description: "Devis après entretien",
        },
        {
          practitionerId: pid,
          name: "Rendez-vous suivi",
          durationMin: 45,
          priceCents: 18000,
          description: "Suivi de dossier",
        },
        {
          practitionerId: pid,
          name: "Forfait mensuel conseil",
          durationMin: 120,
          priceCents: 80000,
          description: "Accompagnement récurrent",
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
    .values({ key: "blueprint.active", value: "cabinet" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "cabinet", updatedAt: new Date() },
    });

  const j = JSON.parse(
    readFileSync(
      join(process.cwd(), "content/blueprints/cabinet/saas-modules.json"),
      "utf8"
    )
  ) as { modules: string[] };
  writeFileSync(
    join(process.cwd(), "saas-modules.json"),
    JSON.stringify({ modules: j.modules }, null, 2) + "\n"
  );

  return {
    slug: "mon-cabinet",
    message:
      "Blueprint cabinet : modules RDV + facturation + annuaire. Seed si nouveau compte (mon-cabinet + 4 prestations).",
  };
}
