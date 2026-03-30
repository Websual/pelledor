"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { MODULE_CATALOG } from "@/core/modules/catalog";
import {
  getModuleTogglesMap,
  saveThemeTokensPayload,
  setModuleToggle,
} from "@/core/theme/db";
import type { ThemeTokens } from "@/core/theme/types";
import { mergeThemeTokens } from "@/core/theme/types";

export async function saveThemeJsonAction(tokens: ThemeTokens) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Non autorise" };
  await saveThemeTokensPayload(mergeThemeTokens(tokens));
  revalidatePath("/admin");
  revalidatePath("/admin/appearance");
  return { ok: true as const };
}

export async function toggleModuleAction(slug: string, enabled: boolean) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Non autorise" };
  const mod = MODULE_CATALOG.find((m) => m.slug === slug);
  if (!mod) return { ok: false as const, error: "Module inconnu" };
  if (mod.requiredByBuild && !enabled) {
    return { ok: false as const, error: "Module requis par le build" };
  }
  await setModuleToggle(slug, enabled);
  revalidatePath("/admin/modules");
  return { ok: true as const, rebuild: true as const };
}

export async function getModulesStateAction() {
  const session = await auth();
  if (!session?.user) return null;
  const toggles = await getModuleTogglesMap();
  return MODULE_CATALOG.map((m) => ({
    ...m,
    enabled: m.requiredByBuild ? true : (toggles[m.slug] ?? false),
  }));
}
