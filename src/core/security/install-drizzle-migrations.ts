import { readdir, readFile } from "fs/promises";
import { join } from "path";
import postgres from "postgres";

const ALLOWED_SQL_NAME = /^[0-9]{4}_[a-zA-Z0-9_.-]+\.sql$/;
const MAX_SQL_FILE_BYTES = 2 * 1024 * 1024;
const MAX_STATEMENT_BYTES = 512 * 1024;
const BREAKPOINT = "--> statement-breakpoint";

/**
 * Applique les migrations SQL du dossier drizzle/ (fichiers numérotés uniquement),
 * dans l'ordre lexicographique. Le contenu est lu depuis le disque (fichiers versionnés) ;
 * chaque fragment est borné en taille et rejeté s'il contient un octet nul.
 */
export async function runInstallDrizzleMigrations(
  sql: postgres.Sql,
): Promise<void> {
  const dir = join(process.cwd(), "drizzle");
  const names = (await readdir(dir))
    .filter((f) => ALLOWED_SQL_NAME.test(f))
    .sort();

  for (const file of names) {
    const path = join(dir, file);
    const buf = await readFile(path);
    if (buf.length > MAX_SQL_FILE_BYTES) {
      throw new Error(`Migration trop volumineuse: ${file}`);
    }
    if (buf.includes(0)) {
      throw new Error(`Migration invalide (octet nul): ${file}`);
    }
    const raw = buf.toString("utf8");
    const statements = raw
      .split(BREAKPOINT)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const st of statements) {
      if (st.length > MAX_STATEMENT_BYTES) {
        throw new Error(`Fragment SQL trop long dans ${file}`);
      }
      if (st.includes("\0")) {
        throw new Error(`Fragment SQL invalide dans ${file}`);
      }
      await sql.unsafe(st);
    }
  }
}
