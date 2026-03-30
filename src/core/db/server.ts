import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as modules from "./schema.modules";

const fullSchema = { ...schema, ...modules };

declare global {
  var __saas_db: ReturnType<typeof drizzle<typeof fullSchema>> | undefined;
  var __saas_pg: ReturnType<typeof postgres> | undefined;
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  if (!globalThis.__saas_db) {
    globalThis.__saas_pg = postgres(url, { max: 10 });
    globalThis.__saas_db = drizzle(globalThis.__saas_pg, {
      schema: fullSchema,
    });
  }
  return globalThis.__saas_db;
}
