import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getDb } from "@/core/db/server";
import { appSettings } from "@/core/db/schema";
import {
  practitioners,
  professions,
  rooms,
} from "@/core/db/schema.modules";
import { setModuleToggle } from "@/core/theme/db";
import { eq } from "drizzle-orm";

const ON = ["notes", "stripe", "directory", "lodging", "notifications"];
const OFF = ["booking", "billing", "events", "blog", "gift-cards", "chat"];

export async function applyGiteModuleToggles() {
  for (const s of ON) await setModuleToggle(s, true);
  for (const s of OFF) await setModuleToggle(s, false);
}

export async function seedGiteProfile(adminUserId: string) {
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
      .where(eq(professions.slug, "hebergement"))
      .limit(1);
    if (ep.length) professionId = ep[0].id;
    else {
      const [pr] = await db
        .insert(professions)
        .values({
          name: "Hébergement",
          slug: "hebergement",
          description: "Gîte / chambres d'hôtes",
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
        slug: "mon-gite",
        title: "Mon gîte",
        bio: "Chambres d'hôtes — réservez en ligne.",
        city: "Ville",
        isActive: true,
      })
      .returning({ id: practitioners.id });
    if (!p) throw new Error("practitioner");
    pid = p.id;
  }

  const count = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.practitionerId, pid));
  if (count.length === 0) {
    await db.insert(rooms).values([
      {
        practitionerId: pid,
        slug: "suite-romantique",
        title: "Suite Romantique",
        description: "Vue jardin, 30 m².",
        capacity: 2,
        priceCentsNight: 12000,
        imageUrl:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=600&q=80",
        published: true,
      },
      {
        practitionerId: pid,
        slug: "chambre-piscine",
        title: "Chambre côté piscine",
        description: "Accès direct espace baignade.",
        capacity: 2,
        priceCentsNight: 11000,
        imageUrl:
          "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80",
        published: true,
      },
    ]);
  }

  const pslug = await db
    .select({ slug: practitioners.slug })
    .from(practitioners)
    .where(eq(practitioners.id, pid))
    .limit(1);
  return {
    practitionerSlug: pslug[0]?.slug ?? "mon-gite",
    message:
      count.length === 0
        ? "2 chambres exemple créées (publiées)."
        : "Profil existant — chambres déjà présentes.",
  };
}

export async function setBlueprintGiteActive() {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key: "blueprint.active", value: "gite" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "gite", updatedAt: new Date() },
    });
}

export function writeGiteSaasModules() {
  const j = JSON.parse(
    readFileSync(join(process.cwd(), "content/blueprints/gite/saas-modules.json"), "utf8")
  ) as { modules: string[] };
  writeFileSync(
    join(process.cwd(), "saas-modules.json"),
    JSON.stringify({ modules: j.modules }, null, 2) + "\n"
  );
}
