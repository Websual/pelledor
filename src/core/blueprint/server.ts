import { getDb } from "@/core/db/server";
import { appSettings } from "@/core/db/schema";
import { eq } from "drizzle-orm";
import {
  mergeArtisanPayload,
  mergeGitePayload,
  mergeHotelPayload,
  mergeCabinetPayload,
  mergeImmobilierPayload,
  mergePraticienPayload,
  mergeRestaurantPayload,
  mergeSalonPayload,
  mergeBoutiquePayload,
  renderArtisanTemplate,
  renderCabinetTemplate,
  renderGiteTemplate,
  renderHotelTemplate,
  renderImmobilierTemplate,
  renderPraticienTemplate,
  renderRestaurantTemplate,
  renderSalonTemplate,
  renderBoutiqueTemplate,
} from "./render";

const KEY_ACTIVE = "blueprint.active";
const KEY_ARTISAN = "blueprint.artisan.payload";
const KEY_GITE = "blueprint.gite.payload";
const KEY_RESTAURANT = "blueprint.restaurant.payload";
const KEY_PRATICIEN = "blueprint.praticien.payload";
const KEY_CABINET = "blueprint.cabinet.payload";
const KEY_IMMOBILIER = "blueprint.immobilier.payload";
const KEY_SALON = "blueprint.salon.payload";
const KEY_HOTEL = "blueprint.hotel.payload";

async function getSetting(key: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return rows[0]?.value?.trim() ?? null;
}

export async function getBlueprintActive(): Promise<string | null> {
  return getSetting(KEY_ACTIVE);
}

export async function getArtisanPayloadJson(): Promise<Record<string, string>> {
  const raw = await getSetting(KEY_ARTISAN);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

export async function renderArtisanHomeHtml(): Promise<string> {
  const payload = mergeArtisanPayload(await getArtisanPayloadJson());
  return renderArtisanTemplate(payload);
}

export async function getGitePayloadJson(): Promise<Record<string, string>> {
  const raw = await getSetting(KEY_GITE);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

export async function renderGiteHomeHtml(): Promise<string> {
  return renderGiteTemplate(mergeGitePayload(await getGitePayloadJson()));
}

export async function getHotelPayloadJson(): Promise<Record<string, string>> {
  const raw = await getSetting(KEY_HOTEL);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

export async function renderHotelHomeHtml(): Promise<string> {
  return renderHotelTemplate(mergeHotelPayload(await getHotelPayloadJson()));
}

export async function getRestaurantPayloadJson(): Promise<
  Record<string, string>
> {
  const raw = await getSetting(KEY_RESTAURANT);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

export async function renderRestaurantHomeHtml(): Promise<string> {
  return renderRestaurantTemplate(
    mergeRestaurantPayload(await getRestaurantPayloadJson())
  );
}

export async function getPraticienPayloadJson(): Promise<Record<string, string>> {
  const raw = await getSetting(KEY_PRATICIEN);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

export async function renderPraticienHomeHtml(): Promise<string> {
  return renderPraticienTemplate(
    mergePraticienPayload(await getPraticienPayloadJson())
  );
}

export async function getCabinetPayloadJson(): Promise<Record<string, string>> {
  const raw = await getSetting(KEY_CABINET);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

export async function renderCabinetHomeHtml(): Promise<string> {
  return renderCabinetTemplate(
    mergeCabinetPayload(await getCabinetPayloadJson())
  );
}

export async function getImmobilierPayloadJson(): Promise<
  Record<string, string>
> {
  const raw = await getSetting(KEY_IMMOBILIER);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

export async function renderImmobilierHomeHtml(): Promise<string> {
  return renderImmobilierTemplate(
    mergeImmobilierPayload(await getImmobilierPayloadJson())
  );
}

export async function getSalonPayloadJson(): Promise<Record<string, string>> {
  const raw = await getSetting(KEY_SALON);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

export async function renderSalonHomeHtml(): Promise<string> {
  return renderSalonTemplate(mergeSalonPayload(await getSalonPayloadJson()));
}

const KEY_BOUTIQUE = "blueprint.boutique.payload";

export async function getBoutiquePayloadJson(): Promise<Record<string, string>> {
  const raw = await getSetting(KEY_BOUTIQUE);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

export async function renderBoutiqueHomeHtml(): Promise<string> {
  return renderBoutiqueTemplate(
    mergeBoutiquePayload(await getBoutiquePayloadJson())
  );
}
