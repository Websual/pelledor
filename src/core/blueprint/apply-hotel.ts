import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getDb } from "@/core/db/server";
import { appSettings } from "@/core/db/schema";
import { practitioners, professions, rooms } from "@/core/db/schema.modules";
import { setModuleToggle } from "@/core/theme/db";
import { eq } from "drizzle-orm";

const ON = ["notes", "stripe", "directory", "lodging", "notifications"];
const OFF = [
  "booking",
  "billing",
  "events",
  "blog",
  "gift-cards",
  "chat",
  "restaurant",
  "artisan-quotes",
];

export async function applyHotelModuleToggles() {
  for (const s of ON) await setModuleToggle(s, true);
  for (const s of OFF) await setModuleToggle(s, false);
}

export async function seedHotelProfile(adminUserId: string) {
  const db = getDb();
  const existing = await db
    .select({ id: practitioners.id })
    .from(practitioners)
    .where(eq(practitioners.userId, adminUserId))
    .limit(1);
  let pid: string;
  if (existing.length) {
    pid = existing[0].id;
  } else {
    let professionId: string | null = null;
    const ep = await db
      .select({ id: professions.id })
      .from(professions)
      .where(eq(professions.slug, "hotel"))
      .limit(1);
    if (ep.length) professionId = ep[0].id;
    else {
      const [pr] = await db
        .insert(professions)
        .values({
          name: "Hôtel",
          slug: "hotel",
          description: "Blueprint hôtel — chambres & nuits",
        })
        .returning({ id: professions.id });
      professionId = pr?.id ?? null;
    }
    if (!professionId) throw new Error("profession");
    const [p] = await db
      .insert(practitioners)
      .values({
        userId: adminUserId,
        professionId,
        slug: "mon-hotel",
        title: "Hôtel démo",
        bio: "Réservation en ligne — chambres et suites.",
        city: "Nice",
        isActive: true,
      })
      .returning({ id: practitioners.id });
    if (!p) throw new Error("practitioner");
    pid = p.id;
  }

  const count = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.practitionerId, pid));
  if (count.length === 0) {
    await db.insert(rooms).values([
      {
        practitionerId: pid,
        slug: "chambre-classique",
        title: "Chambre Classique",
        description: "Calme, literie premium, vue cour.",
        capacity: 2,
        priceCentsNight: 8900,
        imageUrl:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
        published: true,
      },
      {
        practitionerId: pid,
        slug: "chambre-superieure",
        title: "Chambre Supérieure",
        description: "Plus d’espace, balcon ou terrasse selon disponibilité.",
        capacity: 2,
        priceCentsNight: 12500,
        imageUrl:
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
        published: true,
      },
      {
        practitionerId: pid,
        slug: "suite-vue-mer",
        title: "Suite vue mer",
        description: "Salon séparé, salle de bain XXL.",
        capacity: 4,
        priceCentsNight: 24900,
        imageUrl:
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
        published: true,
      },
    ]);
  }

  await db
    .insert(appSettings)
    .values({ key: "blueprint.active", value: "hotel" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "hotel", updatedAt: new Date() },
    });

  const j = JSON.parse(
    readFileSync(
      join(process.cwd(), "content/blueprints/hotel/saas-modules.json"),
      "utf8"
    )
  ) as { modules: string[] };
  writeFileSync(
    join(process.cwd(), "saas-modules.json"),
    JSON.stringify({ modules: j.modules }, null, 2) + "\n"
  );

  const pslug = await db
    .select({ slug: practitioners.slug })
    .from(practitioners)
    .where(eq(practitioners.id, pid))
    .limit(1);

  return {
    practitionerSlug: pslug[0]?.slug ?? "mon-hotel",
    message:
      count.length === 0
        ? "3 chambres hôtel créées (classique, supérieure, suite)."
        : "Profil existant — chambres déjà présentes.",
  };
}
