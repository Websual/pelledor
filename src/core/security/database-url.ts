/**
 * Validation minimale de DATABASE_URL pour limiter injections et URLs manifestement invalides.
 */
export function assertSafePostgresUrl(url: string): { ok: true } | { ok: false; error: string } {
  const trimmed = url.trim();
  if (trimmed.length < 12 || trimmed.length > 2048) {
    return { ok: false, error: "DATABASE_URL longueur invalide." };
  }
  if (/[\r\n\x00]/.test(trimmed)) {
    return { ok: false, error: "DATABASE_URL contient des caractères interdits." };
  }
  if (
    !trimmed.startsWith("postgres://") &&
    !trimmed.startsWith("postgresql://")
  ) {
    return {
      ok: false,
      error: "DATABASE_URL doit utiliser postgres:// ou postgresql://",
    };
  }
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, error: "DATABASE_URL mal formée." };
  }
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") {
    return { ok: false, error: "Protocole invalide." };
  }
  if (!u.hostname) {
    return { ok: false, error: "Hôte (hostname) manquant." };
  }
  if (isBlockedHost(u.hostname)) {
    return {
      ok: false,
      error:
        "Hôte réservé / non autorisé pour cette installation (utilisez une base accessible explicitement).",
    };
  }
  return { ok: true };
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "metadata.google.internal" || h.endsWith(".internal")) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}
