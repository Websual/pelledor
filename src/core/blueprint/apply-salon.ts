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
import { applyPraticienToggles } from "./apply-praticien";

export async function applySalonToggles() {
  await applyPraticienToggles();
}

export async function seedSalon(adminUserId: string) {
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
      .where(eq(professions.slug, "salon-coiffure"))
      .limit(1);
    if (ep.length) profId = ep[0].id;
    else {
      const [pr] = await db
        .insert(professions)
        .values({
          name: "Salon de coiffure",
          slug: "salon-coiffure",
          description: "Blueprint salon",
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
        slug: "mon-salon",
        title: "Salon",
        bio: "Coiffure — réservation en ligne.",
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
          name: "Coupe femme",
          durationMin: 45,
          priceCents: 4500,
          description: "Shampooing inclus",
        },
        {
          practitionerId: pid,
          name: "Coupe homme",
          durationMin: 30,
          priceCents: 2800,
          description: "",
        },
        {
          practitionerId: pid,
          name: "Coupe + brushing",
          durationMin: 60,
          priceCents: 5500,
          description: "",
        },
        {
          practitionerId: pid,
          name: "Coloration",
          durationMin: 90,
          priceCents: 6500,
          description: "À partir de",
        },
        {
          practitionerId: pid,
          name: "Soin profond",
          durationMin: 30,
          priceCents: 1500,
          description: "",
        },
        {
          practitionerId: pid,
          name: "Barbe",
          durationMin: 20,
          priceCents: 1500,
          description: "",
        },
      ]);
    }
    const whCount = await db
      .select({ id: workingHours.id })
      .from(workingHours)
      .where(eq(workingHours.practitionerId, pid));
    if (whCount.length === 0) {
      for (let d = 1; d <= 6; d++) {
        await db.insert(workingHours).values({
          practitionerId: pid,
          dayOfWeek: d,
          startTime: "09:00",
          endTime: d === 6 ? "17:00" : "19:00",
          isActive: true,
        });
      }
    }
  }

  await db
    .insert(appSettings)
    .values({ key: "blueprint.active", value: "salon" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "salon", updatedAt: new Date() },
    });

  const j = JSON.parse(
    readFileSync(
      join(process.cwd(), "content/blueprints/salon/saas-modules.json"),
      "utf8"
    )
  ) as { modules: string[] };
  writeFileSync(
    join(process.cwd(), "saas-modules.json"),
    JSON.stringify({ modules: j.modules }, null, 2) + "\n"
  );

  return {
    slug: "mon-salon",
    message: "Blueprint salon : RDV + chat. Seed mon-salon + 6 prestations si nouveau compte.",
  };
}
