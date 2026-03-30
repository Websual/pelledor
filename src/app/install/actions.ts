"use server";

import { hash } from "bcryptjs";
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import postgres from "postgres";
import { bootstrapServer } from "@/core/bootstrap-server";
import { Hooks } from "@/core/events/hooks";
import {
  generateAuthSecret,
  generateEncryptionKeyHex,
  generateSalt,
} from "@/core/security/crypto";

export type InstallResult =
  | { ok: true; envSnippet: string; wroteEnv: boolean }
  | { ok: false; error: string };

async function runMigrationSql(databaseUrl: string): Promise<void> {
  const dir = join(process.cwd(), "drizzle");
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    for (const file of files) {
      const raw = await readFile(join(dir, file), "utf8");
      const statements = raw
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const st of statements) {
        await sql.unsafe(st);
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function runInstall(formData: FormData): Promise<InstallResult> {
  if (process.env.SAAS_INSTALLED === "true") {
    return { ok: false, error: "Deja installe." };
  }

  const databaseUrl = String(formData.get("databaseUrl") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const adminPassword = String(formData.get("adminPassword") ?? "");
  const blueprint = String(formData.get("blueprint") ?? "artisan").trim().toLowerCase();

  if (!databaseUrl.startsWith("postgres")) {
    return { ok: false, error: "DATABASE_URL invalide (postgres requis)." };
  }
  if (!adminEmail.includes("@")) {
    return { ok: false, error: "Email admin invalide." };
  }
  if (adminPassword.length < 8) {
    return { ok: false, error: "Mot de passe admin : min. 8 caracteres." };
  }
  const allowedBlueprints = new Set([
    "artisan",
    "restaurant",
    "gite",
    "hotel",
    "praticien",
    "cabinet",
    "immobilier",
    "salon",
    "boutique",
  ]);
  if (!allowedBlueprints.has(blueprint)) {
    return { ok: false, error: "Blueprint invalide." };
  }

  const encryptionKey = generateEncryptionKeyHex();
  const authSecret = generateAuthSecret();
  const nonceSalt = generateSalt();
  const secureAuthSalt = generateSalt();

  try {
    await runMigrationSql(databaseUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Connexion ou migration impossible : ${msg}`,
    };
  }

  const passwordHash = await hash(adminPassword, 12);
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql`
      INSERT INTO app_settings (key, value) VALUES ('installed', 'true')
      ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now()
    `;
    await sql`
      INSERT INTO app_settings (key, value) VALUES ('blueprint.active', ${blueprint})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
    await sql.unsafe(`
      INSERT INTO app_settings (key, value) VALUES ('blueprint.${blueprint}.payload', '{}')
      ON CONFLICT (key) DO NOTHING
    `);
    const inserted = await sql<{ id: string }[]>`
      INSERT INTO users (email, password_hash, role)
      VALUES (${adminEmail}, ${passwordHash}, 'admin')
      RETURNING id
    `;
    const userId = inserted[0]?.id;
    if (userId) {
      bootstrapServer();
      await Hooks.doAction("user_created", {
        userId,
        email: adminEmail,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sql.end({ timeout: 5 });
    return { ok: false, error: `Ecriture base : ${msg}` };
  }
  await sql.end({ timeout: 5 });

  const envLines = [
    "# Genere par Pelledor - ne pas commiter",
    `DATABASE_URL="${databaseUrl.replace(/"/g, '\\"')}"`,
    `ENCRYPTION_KEY=${encryptionKey}`,
    `AUTH_SECRET=${authSecret}`,
    `NONCE_SALT=${nonceSalt}`,
    `SECURE_AUTH_SALT=${secureAuthSalt}`,
    "SAAS_INSTALLED=true",
    "",
  ];
  const envSnippet = envLines.join("\n");

  let wroteEnv = false;
  const envPath = join(process.cwd(), ".env.local");
  try {
    await writeFile(envPath, envSnippet, { mode: 0o600 });
    wroteEnv = true;
  } catch {
    // read-only FS (ex. certain deploy) : utilisateur colle le snippet
  }

  return { ok: true, envSnippet, wroteEnv };
}
