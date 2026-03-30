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
  "anamnese",
];
const OFF = [
  "lodging",
  "restaurant",
  "events",
  "blog",
  "gift-cards",
  "artisan-quotes",
  "click-collect",
];

export async function applyPraticienToggles() {
  for (const s of ON) await setModuleToggle(s, true);
  for (const s of OFF) await setModuleToggle(s, false);
}

export async function seedPraticien(adminUserId: string) {
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
      .where(eq(professions.slug, "praticien-bien-etre"))
      .limit(1);
    if (ep.length) profId = ep[0].id;
    else {
      const [pr] = await db
        .insert(professions)
        .values({
          name: "Praticien bien-être",
          slug: "praticien-bien-etre",
          description: "Blueprint praticien (séances, RDV)",
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
        slug: "mon-praticien",
        title: "Cabinet — praticien",
        bio: "Séances sur rendez-vous. Première séance découverte.",
        city: "Lyon",
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
          name: "Sophrologie individuelle",
          durationMin: 60,
          priceCents: 6000,
          description: "Stress, sommeil, préparation mentale",
        },
        {
          practitionerId: pid,
          name: "Première séance découverte",
          durationMin: 60,
          priceCents: 5000,
          description: "Entretien + pratique guidée",
        },
        {
          practitionerId: pid,
          name: "Séance à distance (visio)",
          durationMin: 60,
          priceCents: 5500,
          description: "Même cadre qu’en présentiel",
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
    .values({ key: "blueprint.active", value: "praticien" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "praticien", updatedAt: new Date() },
    });

  const j = JSON.parse(
    readFileSync(
      join(process.cwd(), "content/blueprints/praticien/saas-modules.json"),
      "utf8"
    )
  ) as { modules: string[] };
  writeFileSync(
    join(process.cwd(), "saas-modules.json"),
    JSON.stringify({ modules: j.modules }, null, 2) + "\n"
  );

  return {
    slug: "mon-praticien",
    message:
      "Modules praticien + vitrine. Seed profil si nouveau compte (mon-praticien + 3 séances).",
  };
}
