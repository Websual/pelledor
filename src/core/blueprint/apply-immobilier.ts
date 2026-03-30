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
  "notifications",
  "events",
];
const OFF = [
  "lodging",
  "restaurant",
  "blog",
  "gift-cards",
  "artisan-quotes",
  "chat",
];

export async function applyImmobilierToggles() {
  for (const s of ON) await setModuleToggle(s, true);
  for (const s of OFF) await setModuleToggle(s, false);
}

export async function seedImmobilier(adminUserId: string) {
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
      .where(eq(professions.slug, "immobilier"))
      .limit(1);
    if (ep.length) profId = ep[0].id;
    else {
      const [pr] = await db
        .insert(professions)
        .values({
          name: "Agence immobilière",
          slug: "immobilier",
          description: "Blueprint immobilier",
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
        slug: "mon-agence",
        title: "Agence immobilière",
        bio: "Achat, vente, location — estimations sur rendez-vous.",
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
          name: "Visite bien (acheteur)",
          durationMin: 45,
          priceCents: 0,
          description: "Créneau visite accompagnée",
        },
        {
          practitionerId: pid,
          name: "Estimation gratuite",
          durationMin: 60,
          priceCents: 0,
          description: "À domicile ou en agence",
        },
        {
          practitionerId: pid,
          name: "Conseil investissement",
          durationMin: 60,
          priceCents: 15000,
          description: "Rendez-vous conseiller",
        },
        {
          practitionerId: pid,
          name: "Mise en location",
          durationMin: 45,
          priceCents: 0,
          description: "État des lieux & dossier",
        },
        {
          practitionerId: pid,
          name: "Accompagnement vente",
          durationMin: 30,
          priceCents: 0,
          description: "Premier entretien vendeur",
        },
        {
          practitionerId: pid,
          name: "Visite virtuelle",
          durationMin: 30,
          priceCents: 0,
          description: "Planification tournage / photo",
        },
      ]);
    }
    const whCount = await db
      .select({ id: workingHours.id })
      .from(workingHours)
      .where(eq(workingHours.practitionerId, pid));
    if (whCount.length === 0) {
      for (const d of [1, 2, 3, 4, 5, 6]) {
        await db.insert(workingHours).values({
          practitionerId: pid,
          dayOfWeek: d,
          startTime: d === 6 ? "09:00" : "09:00",
          endTime: d === 6 ? "12:00" : "18:00",
          isActive: true,
        });
      }
    }
  }

  await db
    .insert(appSettings)
    .values({ key: "blueprint.active", value: "immobilier" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "immobilier", updatedAt: new Date() },
    });

  const j = JSON.parse(
    readFileSync(
      join(process.cwd(), "content/blueprints/immobilier/saas-modules.json"),
      "utf8"
    )
  ) as { modules: string[] };
  writeFileSync(
    join(process.cwd(), "saas-modules.json"),
    JSON.stringify({ modules: j.modules }, null, 2) + "\n"
  );

  return {
    slug: "mon-agence",
    message:
      "Blueprint immobilier : RDV + annuaire + événements (portes ouvertes). Seed mon-agence si nouveau compte.",
  };
}
