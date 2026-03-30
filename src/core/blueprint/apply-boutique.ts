import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getDb } from "@/core/db/server";
import { appSettings } from "@/core/db/schema";
import { shippingRates, shippingZones } from "@/core/db/schema.modules";
import { setModuleToggle } from "@/core/theme/db";

const ON = ["shop", "stripe", "notes", "notifications"];
const OFF = [
  "lodging",
  "restaurant",
  "booking",
  "billing",
  "events",
  "blog",
  "gift-cards",
  "artisan-quotes",
  "chat",
  "directory",
];

export async function applyBoutiqueToggles() {
  for (const s of ON) await setModuleToggle(s, true);
  for (const s of OFF) await setModuleToggle(s, false);
}

export async function seedShippingIfEmpty() {
  const db = getDb();
  const zones = await db.select().from(shippingZones);
  if (zones.length > 0) return;
  const [zone] = await db
    .insert(shippingZones)
    .values({
      name: "France",
      countryCodes: "FR,BE,MC,LU",
      sortOrder: 0,
    })
    .returning({ id: shippingZones.id });
  if (zone) {
    await db.insert(shippingRates).values([
      { zoneId: zone.id, minOrderCents: 0, priceCents: 500, sortOrder: 0 },
      {
        zoneId: zone.id,
        minOrderCents: 5000,
        freeShippingOverCents: 5000,
        priceCents: 0,
        sortOrder: 1,
      },
    ]);
  }
}

export async function setBlueprintBoutiqueActive() {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key: "blueprint.active", value: "boutique" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "boutique", updatedAt: new Date() },
    });
}

export function writeBoutiqueSaasModules() {
  const j = JSON.parse(
    readFileSync(
      join(process.cwd(), "content/blueprints/boutique/saas-modules.json"),
      "utf8"
    )
  ) as { modules: string[] };
  writeFileSync(
    join(process.cwd(), "saas-modules.json"),
    JSON.stringify({ modules: j.modules }, null, 2) + "\n"
  );
}
