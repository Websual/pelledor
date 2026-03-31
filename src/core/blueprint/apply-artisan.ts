/**
 * Configuration métier blueprint Artisan : bascules modules + seed minimal.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getDb } from "@/core/db/server";
import {
  practitioners,
  professions,
  services,
  workingHours,
} from "@/core/db/schema.modules";
import { setModuleToggle } from "@/core/theme/db";
import { eq } from "drizzle-orm";

function loadBlueprintBusiness(): { modulesOn: string[]; modulesOff: string[] } {
  try {
    const raw = readFileSync(
      join(process.cwd(), "content/blueprints/artisan/blueprint.json"),
      "utf8"
    );
    const j = JSON.parse(raw) as {
      business?: { modulesOn?: string[]; modulesOff?: string[] };
    };
    return {
      modulesOn: j.business?.modulesOn ?? [],
      modulesOff: j.business?.modulesOff ?? [],
    };
  } catch {
    return {
      modulesOn: [
        "notes",
        "stripe",
        "directory",
        "booking",
        "billing",
        "artisan-quotes",
        "notifications",
        "blog",
      ],
      modulesOff: ["events", "gift-cards", "chat"],
    };
  }
}

export async function applyArtisanModuleToggles(): Promise<void> {
  const { modulesOn, modulesOff } = loadBlueprintBusiness();
  for (const slug of modulesOn) await setModuleToggle(slug, true);
  for (const slug of modulesOff) await setModuleToggle(slug, false);
}

export async function seedArtisanProfile(adminUserId: string): Promise<{
  practitionerId: string | null;
  message: string;
}> {
  const db = getDb();

  const existing = await db
    .select({ id: practitioners.id })
    .from(practitioners)
    .where(eq(practitioners.userId, adminUserId))
    .limit(1);

  if (existing.length) {
    return {
      practitionerId: existing[0].id,
      message: "Profil entreprise déjà lié à ce compte — seed ignoré.",
    };
  }

  let professionId: string | null = null;
  const existingProf = await db
    .select({ id: professions.id })
    .from(professions)
    .where(eq(professions.slug, "artisan-batiment"))
    .limit(1);
  if (existingProf.length) {
    professionId = existingProf[0].id;
  } else {
    const [prof] = await db
      .insert(professions)
      .values({
        name: "Artisan du bâtiment",
        slug: "artisan-batiment",
        description: "Métier par défaut blueprint Artisan",
      })
      .returning({ id: professions.id });
    professionId = prof?.id ?? null;
  }
  if (!professionId) {
    return { practitionerId: null, message: "Impossible de créer la profession." };
  }

  const [p] = await db
    .insert(practitioners)
    .values({
      userId: adminUserId,
      professionId,
      slug: "mon-entreprise",
      title: "Mon entreprise",
      bio: "Décrivez votre activité (devis gratuit, zone d’intervention…).",
      city: "Ville",
      isActive: true,
    })
    .returning({ id: practitioners.id });

  if (!p) {
    return { practitionerId: null, message: "Création profil impossible." };
  }

  const pid = p.id;

  await db.insert(services).values([
    {
      practitionerId: pid,
      name: "Dépannage / diagnostic",
      durationMin: 60,
      priceCents: 8000,
      description: "Intervention urgente ou visite technique",
    },
    {
      practitionerId: pid,
      name: "Devis & prestation",
      durationMin: 120,
      priceCents: 0,
      description: "Devis sur place puis réalisation",
    },
    {
      practitionerId: pid,
      name: "Forfait demi-journée",
      durationMin: 240,
      priceCents: 25000,
      description: "Main d’œuvre 4h",
    },
  ]);

  for (let d = 1; d <= 5; d++) {
    await db.insert(workingHours).values({
      practitionerId: pid,
      dayOfWeek: d,
      startTime: "08:00",
      endTime: "18:00",
      isActive: true,
    });
  }

  return {
    practitionerId: pid,
    message:
      "Profil entreprise + 3 prestations + horaires Lun–Ven créés. Renommez slug / ville dans Données demo.",
  };
}
