import { eq } from "drizzle-orm";
import { getDb } from "@/core/db/server";
import { moduleToggles, themeTokens } from "@/core/db/schema";
import type { ThemeTokens } from "@/core/theme/types";
import { mergeThemeTokens } from "@/core/theme/types";

const THEME_ID = "default";

export async function getThemeTokensResolved(): Promise<ThemeTokens> {
  const db = getDb();
  const row = await db.query.themeTokens.findFirst({
    where: eq(themeTokens.id, THEME_ID),
  });
  const raw = (row?.payload as Record<string, unknown>) ?? {};
  return mergeThemeTokens(raw);
}

export async function saveThemeTokensPayload(
  payload: ThemeTokens
): Promise<void> {
  const db = getDb();
  await db
    .insert(themeTokens)
    .values({ id: THEME_ID, payload: payload as unknown as Record<string, unknown> })
    .onConflictDoUpdate({
      target: themeTokens.id,
      set: {
        payload: payload as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      },
    });
}

export async function getModuleTogglesMap(): Promise<Record<string, boolean>> {
  const db = getDb();
  const rows = await db.select().from(moduleToggles);
  const map: Record<string, boolean> = {};
  for (const r of rows) map[r.slug] = r.enabled;
  return map;
}

export async function setModuleToggle(
  slug: string,
  enabled: boolean
): Promise<void> {
  const db = getDb();
  await db
    .insert(moduleToggles)
    .values({ slug, enabled })
    .onConflictDoUpdate({
      target: moduleToggles.slug,
      set: { enabled, updatedAt: new Date() },
    });
}
