import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getDb } from "@/core/db/server";
import { appSettings } from "@/core/db/schema";
import {
  practitioners,
  professions,
  restaurantTables,
} from "@/core/db/schema.modules";
import { setModuleToggle } from "@/core/theme/db";
import { eq } from "drizzle-orm";

const ON = ["notes", "stripe", "directory", "restaurant", "notifications", "click-collect"];
const OFF = ["lodging", "events", "blog", "gift-cards", "anamnese"];

export async function applyRestaurantToggles() {
  for (const s of ON) await setModuleToggle(s, true);
  for (const s of OFF) await setModuleToggle(s, false);
  await setModuleToggle("booking", false);
  await setModuleToggle("billing", false);
  await setModuleToggle("chat", false);
}

export async function seedRestaurant(adminUserId: string) {
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
      .where(eq(professions.slug, "restaurant"))
      .limit(1);
    if (ep.length) profId = ep[0].id;
    else {
      const [pr] = await db
        .insert(professions)
        .values({
          name: "Restaurant",
          slug: "restaurant",
          description: "Blueprint restaurant",
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
        slug: "mon-restaurant",
        title: "Mon restaurant",
        bio: "Réservez votre table en ligne.",
        city: "Ville",
        isActive: true,
      })
      .returning({ id: practitioners.id });
    if (!p) throw new Error("practitioner");
    pid = p.id;
  }

  const n = await db
    .select({ id: restaurantTables.id })
    .from(restaurantTables)
    .where(eq(restaurantTables.practitionerId, pid));
  if (n.length === 0) {
    await db.insert(restaurantTables).values([
      { practitionerId: pid, name: "Salle — Table 2", seats: 2, sortOrder: 1 },
      { practitionerId: pid, name: "Salle — Table 4", seats: 4, sortOrder: 2 },
      { practitionerId: pid, name: "Salle — Table 6", seats: 6, sortOrder: 3 },
      { practitionerId: pid, name: "Terrasse — T4", seats: 4, sortOrder: 4 },
    ]);
  }

  await db
    .insert(appSettings)
    .values({ key: "blueprint.active", value: "restaurant" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "restaurant", updatedAt: new Date() },
    });

  const j = JSON.parse(
    readFileSync(
      join(process.cwd(), "content/blueprints/restaurant/saas-modules.json"),
      "utf8"
    )
  ) as { modules: string[] };
  writeFileSync(
    join(process.cwd(), "saas-modules.json"),
    JSON.stringify({ modules: j.modules }, null, 2) + "\n"
  );

  return { slug: "mon-restaurant", message: "Tables exemple + blueprint restaurant." };
}
