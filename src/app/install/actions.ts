"use server";

import { hash } from "bcryptjs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import postgres from "postgres";
import { bootstrapServer } from "@/core/bootstrap-server";
import { Hooks } from "@/core/events/hooks";
import {
  generateAuthSecret,
  generateEncryptionKeyHex,
  generateSalt,
} from "@/core/security/crypto";
import { assertSafePostgresUrl } from "@/core/security/database-url";
import { runInstallDrizzleMigrations } from "@/core/security/install-drizzle-migrations";
import { rateLimitMemory } from "@/core/security/rate-limit-memory";
import { headers } from "next/headers";

export type InstallResult =
  | { ok: true; envSnippet: string; wroteEnv: boolean }
  | { ok: false; error: string };

async function runMigrationSql(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await runInstallDrizzleMigrations(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function runInstall(formData: FormData): Promise<InstallResult> {
  if (process.env.SAAS_INSTALLED === "true") {
    return { ok: false, error: "Deja installe." };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip")?.trim() ??
    "unknown";
  if (!rateLimitMemory(`install:${ip}`, 5, 60 * 60 * 1000)) {
    return {
      ok: false,
      error: "Trop de tentatives d installation. Réessayez plus tard.",
    };
  }

  const databaseUrl = String(formData.get("databaseUrl") ?? "").trim();
  const urlOk = assertSafePostgresUrl(databaseUrl);
  if (!urlOk.ok) {
    return { ok: false, error: urlOk.error };
  }
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
    "avocat",
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
    const blueprintPayloadKey = `blueprint.${blueprint}.payload`;
    await sql`
      INSERT INTO app_settings (key, value) VALUES (${blueprintPayloadKey}, '{}')
      ON CONFLICT (key) DO NOTHING
    `;
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

  // Lire le .env.local existant pour préserver les variables supplémentaires
  const envPath = join(process.cwd(), ".env.local");
  const PRESERVED_KEYS = [
    "AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL",
    "PELLEDOR_AGENT_TOKEN", "PELLEDOR_AGENT_PRACTITIONER_ID", "PELLEDOR_AGENT_ALLOW_THEME",
    "PELLEDOR_MCP_BASE_URL",
    "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_NOTE_PRICE_ID", "STRIPE_NOTE_PRICE_CENTS",
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_SECURE", "MAIL_FROM",
  ];
  const preserved: Record<string, string> = {};
  try {
    const existing = await readFile(envPath, "utf8");
    for (const line of existing.split("\n")) {
      const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
      if (m && PRESERVED_KEYS.includes(m[1])) {
        preserved[m[1]] = m[2];
      }
    }
  } catch { /* pas de .env.local existant, c'est ok */ }

  const envLines = [
    "# Genere par Pelledor - ne pas commiter",
    `DATABASE_URL="${databaseUrl.replace(/"/g, '\\"')}"`,
    `ENCRYPTION_KEY=${encryptionKey}`,
    `AUTH_SECRET=${authSecret}`,
    `NONCE_SALT=${nonceSalt}`,
    `SECURE_AUTH_SALT=${secureAuthSalt}`,
    "SAAS_INSTALLED=true",
    "",
    "# URL publique du site (adapte a votre domaine)",
    `AUTH_URL=${preserved["AUTH_URL"] ?? preserved["NEXTAUTH_URL"] ?? "http://localhost:3000"}`,
    `NEXT_PUBLIC_APP_URL=${preserved["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"}`,
    "",
    "# Stripe (optionnel - paiements en ligne)",
    `# STRIPE_SECRET_KEY=${preserved["STRIPE_SECRET_KEY"] ?? "sk_live_..."}`,
    `# STRIPE_WEBHOOK_SECRET=${preserved["STRIPE_WEBHOOK_SECRET"] ?? "whsec_..."}`,
    "",
    "# Agent / MCP (optionnel - automatisation par IA)",
    `# PELLEDOR_AGENT_TOKEN=${preserved["PELLEDOR_AGENT_TOKEN"] ?? "token-secret-min-32-chars"}`,
    `# PELLEDOR_AGENT_PRACTITIONER_ID=${preserved["PELLEDOR_AGENT_PRACTITIONER_ID"] ?? "uuid-du-praticien"}`,
    "",
  ];

  // Réinjecter les variables préservées non encore incluses
  for (const [k, v] of Object.entries(preserved)) {
    if (!envLines.some(l => l.startsWith(k + "="))) {
      envLines.push(`${k}=${v}`);
    }
  }

  const envSnippet = envLines.join("\n");

  let wroteEnv = false;
  try {
    await writeFile(envPath, envSnippet, { mode: 0o600 });
    wroteEnv = true;
  } catch {
    // read-only FS (ex. certain deploy) : utilisateur colle le snippet
  }

  // Déclencher un redémarrage automatique pour recharger .env.local (SAAS_INSTALLED + clés)
  if (wroteEnv) {
    setTimeout(() => {
      const pm2 = spawn("pm2", ["restart", "pelledor", "--update-env"], {
        detached: true,
        stdio: "ignore",
        env: { ...process.env, PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin:/root/.nvm/versions/node/v24.10.0/bin" },
      });
      pm2.unref();
    }, 1500);
  }

  return { ok: true, envSnippet, wroteEnv };
}
