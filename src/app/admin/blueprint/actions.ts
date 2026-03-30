"use server";

import { auth } from "@/auth";
import { getDb } from "@/core/db/server";
import { appSettings } from "@/core/db/schema";
import { artisanPlaceholderDefaults } from "@/core/blueprint/defaults-artisan";
import {
  applyArtisanModuleToggles,
  seedArtisanProfile,
} from "@/core/blueprint/apply-artisan";
import {
  applyGiteModuleToggles,
  seedGiteProfile,
  setBlueprintGiteActive,
  writeGiteSaasModules,
} from "@/core/blueprint/apply-gite";
import { applyRestaurantToggles, seedRestaurant } from "@/core/blueprint/apply-restaurant";
import {
  applyPraticienToggles,
  seedPraticien,
} from "@/core/blueprint/apply-praticien";
import { applyCabinetToggles, seedCabinet } from "@/core/blueprint/apply-cabinet";
import {
  applyImmobilierToggles,
  seedImmobilier,
} from "@/core/blueprint/apply-immobilier";
import { applySalonToggles, seedSalon } from "@/core/blueprint/apply-salon";
import {
  applyHotelModuleToggles,
  seedHotelProfile,
} from "@/core/blueprint/apply-hotel";
import {
  applyBoutiqueToggles,
  setBlueprintBoutiqueActive,
  writeBoutiqueSaasModules,
} from "@/core/blueprint/apply-boutique";
import { applyAvocatToggles, seedAvocat } from "@/core/blueprint/apply-avocat";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const KEY_ACTIVE = "blueprint.active";
const KEY_ARTISAN = "blueprint.artisan.payload";
const KEY_GITE = "blueprint.gite.payload";
const KEY_RESTAURANT = "blueprint.restaurant.payload";
const KEY_PRATICIEN = "blueprint.praticien.payload";
const KEY_CABINET = "blueprint.cabinet.payload";
const KEY_IMMOBILIER = "blueprint.immobilier.payload";
const KEY_SALON = "blueprint.salon.payload";
const KEY_HOTEL = "blueprint.hotel.payload";
const KEY_AVOCAT = "blueprint.avocat.payload";

export async function saveBlueprintSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Non authentifié" };

  const active = String(formData.get("active") ?? "none").trim();
  if (
    ![
      "none",
      "artisan",
      "gite",
      "restaurant",
      "praticien",
      "cabinet",
      "immobilier",
      "salon",
      "hotel",
      "boutique",
      "avocat",
    ].includes(active)
  ) {
    return { ok: false as const, error: "Blueprint invalide" };
  }

  const payloadRaw = String(formData.get("payloadJson") ?? "").trim();
  let payload: Record<string, string> = {};
  if (payloadRaw) {
    try {
      const j = JSON.parse(payloadRaw) as unknown;
      if (j && typeof j === "object" && !Array.isArray(j)) {
        payload = Object.fromEntries(
          Object.entries(j as Record<string, unknown>).map(([k, v]) => [
            k,
            String(v ?? ""),
          ])
        );
      }
    } catch {
      return { ok: false as const, error: "JSON payload invalide" };
    }
  }

  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key: KEY_ACTIVE, value: active })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: active, updatedAt: new Date() },
    });

  await db
    .insert(appSettings)
    .values({ key: KEY_ARTISAN, value: JSON.stringify(payload) })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: JSON.stringify(payload), updatedAt: new Date() },
    });

  if (active === "restaurant") {
    const restRaw = String(formData.get("payloadJsonRestaurant") ?? "").trim();
    let restPayload: Record<string, string> = {};
    if (restRaw) {
      try {
        const rj = JSON.parse(restRaw) as Record<string, unknown>;
        if (rj && typeof rj === "object")
          restPayload = Object.fromEntries(
            Object.entries(rj).map(([k, v]) => [k, String(v ?? "")])
          );
      } catch {
        return { ok: false as const, error: "JSON restaurant invalide" };
      }
    }
    await db
      .insert(appSettings)
      .values({ key: KEY_RESTAURANT, value: JSON.stringify(restPayload) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(restPayload), updatedAt: new Date() },
      });
  }

  if (active === "gite") {
    const giteRaw = String(formData.get("payloadJsonGite") ?? "").trim();
    let gitePayload: Record<string, string> = {};
    if (giteRaw) {
      try {
        const gj = JSON.parse(giteRaw) as Record<string, unknown>;
        if (gj && typeof gj === "object")
          gitePayload = Object.fromEntries(
            Object.entries(gj).map(([k, v]) => [k, String(v ?? "")])
          );
      } catch {
        return { ok: false as const, error: "JSON gîte invalide" };
      }
    }
    await db
      .insert(appSettings)
      .values({ key: KEY_GITE, value: JSON.stringify(gitePayload) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(gitePayload), updatedAt: new Date() },
      });
  }

  if (active === "hotel") {
    const hRaw = String(formData.get("payloadJsonHotel") ?? "").trim();
    let hPayload: Record<string, string> = {};
    if (hRaw) {
      try {
        const hj = JSON.parse(hRaw) as Record<string, unknown>;
        if (hj && typeof hj === "object")
          hPayload = Object.fromEntries(
            Object.entries(hj).map(([k, v]) => [k, String(v ?? "")])
          );
      } catch {
        return { ok: false as const, error: "JSON hôtel invalide" };
      }
    }
    await db
      .insert(appSettings)
      .values({ key: KEY_HOTEL, value: JSON.stringify(hPayload) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(hPayload), updatedAt: new Date() },
      });
  }

  if (active === "praticien") {
    const prRaw = String(formData.get("payloadJsonPraticien") ?? "").trim();
    let prPayload: Record<string, string> = {};
    if (prRaw) {
      try {
        const pj = JSON.parse(prRaw) as Record<string, unknown>;
        if (pj && typeof pj === "object")
          prPayload = Object.fromEntries(
            Object.entries(pj).map(([k, v]) => [k, String(v ?? "")])
          );
      } catch {
        return { ok: false as const, error: "JSON praticien invalide" };
      }
    }
    await db
      .insert(appSettings)
      .values({ key: KEY_PRATICIEN, value: JSON.stringify(prPayload) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(prPayload), updatedAt: new Date() },
      });
  }

  if (active === "cabinet") {
    const cabRaw = String(formData.get("payloadJsonCabinet") ?? "").trim();
    let cabPayload: Record<string, string> = {};
    if (cabRaw) {
      try {
        const cj = JSON.parse(cabRaw) as Record<string, unknown>;
        if (cj && typeof cj === "object")
          cabPayload = Object.fromEntries(
            Object.entries(cj).map(([k, v]) => [k, String(v ?? "")])
          );
      } catch {
        return { ok: false as const, error: "JSON cabinet invalide" };
      }
    }
    await db
      .insert(appSettings)
      .values({ key: KEY_CABINET, value: JSON.stringify(cabPayload) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(cabPayload), updatedAt: new Date() },
      });
  }

  if (active === "immobilier") {
    const imRaw = String(formData.get("payloadJsonImmobilier") ?? "").trim();
    let imPayload: Record<string, string> = {};
    if (imRaw) {
      try {
        const ij = JSON.parse(imRaw) as Record<string, unknown>;
        if (ij && typeof ij === "object")
          imPayload = Object.fromEntries(
            Object.entries(ij).map(([k, v]) => [k, String(v ?? "")])
          );
      } catch {
        return { ok: false as const, error: "JSON immobilier invalide" };
      }
    }
    await db
      .insert(appSettings)
      .values({ key: KEY_IMMOBILIER, value: JSON.stringify(imPayload) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(imPayload), updatedAt: new Date() },
      });
  }

  if (active === "salon") {
    const salRaw = String(formData.get("payloadJsonSalon") ?? "").trim();
    let salPayload: Record<string, string> = {};
    if (salRaw) {
      try {
        const sj = JSON.parse(salRaw) as Record<string, unknown>;
        if (sj && typeof sj === "object")
          salPayload = Object.fromEntries(
            Object.entries(sj).map(([k, v]) => [k, String(v ?? "")])
          );
      } catch {
        return { ok: false as const, error: "JSON salon invalide" };
      }
    }
    await db
      .insert(appSettings)
      .values({ key: KEY_SALON, value: JSON.stringify(salPayload) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(salPayload), updatedAt: new Date() },
      });
  }
  if (active === "avocat") {
    const raw = String(formData.get("payloadJsonAvocat") ?? "").trim();
    let avocatPayload: Record<string, string> = {};
    if (raw) {
      try {
        const aj = JSON.parse(raw) as Record<string, unknown>;
        if (aj && typeof aj === "object")
          avocatPayload = Object.fromEntries(
            Object.entries(aj).map(([k, v]) => [k, String(v ?? "")])
          );
      } catch {
        return { ok: false as const, error: "JSON avocat invalide" };
      }
    }
    await db
      .insert(appSettings)
      .values({ key: KEY_AVOCAT, value: JSON.stringify(avocatPayload) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(avocatPayload), updatedAt: new Date() },
      });
  }

  return { ok: true as const };
}

export async function applyAvocatBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applyAvocatToggles();
    const r = await seedAvocat(session.user.id);
    return {
      ok: true as const,
      message: r.message,
      hint:
        "pnpm saas:build && pnpm build - RDV /login - annuaire /annuaire/mon-avocat",
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function applyGiteBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applyGiteModuleToggles();
    await setBlueprintGiteActive();
    const seed = await seedGiteProfile(session.user.id);
    writeGiteSaasModules();
    return {
      ok: true as const,
      seedMessage: seed.message,
      practitionerSlug: seed.practitionerSlug,
      hint: "pnpm saas:build puis pnpm build. Résa : /hebergement/chambre/suite-romantique?e=mon-gite",
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function applyBoutiqueBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applyBoutiqueToggles();
    await setBlueprintBoutiqueActive();
    writeBoutiqueSaasModules();
    const { seedShippingIfEmpty } = await import("@/core/blueprint/apply-boutique");
    await seedShippingIfEmpty();
    return {
      ok: true as const,
      message: "Blueprint boutique activé. Module shop + stripe + notes.",
      hint: "pnpm saas:build && pnpm build — Catalogue : /boutique — Admin : /admin/shop",
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function applyHotelBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applyHotelModuleToggles();
    const seed = await seedHotelProfile(session.user.id);
    return {
      ok: true as const,
      seedMessage: seed.message,
      practitionerSlug: seed.practitionerSlug,
      hint:
        "pnpm saas:build && pnpm build — Résa : /hebergement/chambre/chambre-classique?e=mon-hotel (3 chambres seed)",
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function applyCabinetBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applyCabinetToggles();
    const r = await seedCabinet(session.user.id);
    return {
      ok: true as const,
      message: r.message,
      hint:
        "pnpm saas:build && pnpm build — RDV : /login puis annuaire /annuaire/mon-cabinet",
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function applyImmobilierBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applyImmobilierToggles();
    const r = await seedImmobilier(session.user.id);
    return {
      ok: true as const,
      message: r.message,
      hint:
        "pnpm saas:build && pnpm build — Événements (portes ouvertes) + RDV — /annuaire/mon-agence",
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function applySalonBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applySalonToggles();
    const r = await seedSalon(session.user.id);
    return {
      ok: true as const,
      message: r.message,
      hint:
        "pnpm saas:build && pnpm build — RDV + chat — LIEN_RDV défaut /login — /annuaire/mon-salon",
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function applyPraticienBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applyPraticienToggles();
    const r = await seedPraticien(session.user.id);
    return {
      ok: true as const,
      message: r.message,
      hint:
        "pnpm saas:build && pnpm build — RDV : connexion client + annuaire /annuaire/mon-praticien",
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function applyRestaurantBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applyRestaurantToggles();
    const r = await seedRestaurant(session.user.id);
    return {
      ok: true as const,
      message: r.message,
      hint: "pnpm saas:build && pnpm build — Réserver : /restauration/reserver?e=mon-restaurant",
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function resetArtisanDefaults() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Non authentifié" };
  const db = getDb();
  await db
    .insert(appSettings)
    .values({
      key: KEY_ARTISAN,
      value: JSON.stringify(artisanPlaceholderDefaults),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: JSON.stringify(artisanPlaceholderDefaults),
        updatedAt: new Date(),
      },
    });
  return { ok: true as const };
}

/** Bascules modules Artisan + seed profil + saas-modules.json → puis saas:build. */
export async function applyArtisanBusinessBlueprint() {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "Non authentifié" };
  try {
    await applyArtisanModuleToggles();
    const seed = await seedArtisanProfile(session.user.id);
    const rec = join(
      process.cwd(),
      "content/blueprints/artisan/saas-modules.json"
    );
    const j = JSON.parse(readFileSync(rec, "utf8")) as { modules: string[] };
    writeFileSync(
      join(process.cwd(), "saas-modules.json"),
      JSON.stringify({ modules: j.modules }, null, 2) + "\n"
    );
    return {
      ok: true as const,
      seedMessage: seed.message,
      hint:
        "saas-modules.json mis à jour — exécuter pnpm saas:build puis pnpm build.",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false as const, error: msg };
  }
}
