import { prisma } from "@/lib/prisma";
import type { LogLevel } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type LogLevelType = LogLevel;

/** Context optionnel pour les logs (objet sérialisable en JSON). */
export type LogContext = Record<string, unknown>;

/**
 * Enregistre un log en base (utilisable dans Server Actions, API routes, etc.).
 * Ne fait pas throw : en cas d'échec d'écriture, on log en console uniquement.
 */
export async function createLog(
  level: LogLevelType,
  message: string,
  context?: LogContext | null
): Promise<void> {
  try {
    await prisma.logs.create({
      data: {
        level,
        message,
        context: (context ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("[createLog] Failed to write log to DB:", err);
  }
}
