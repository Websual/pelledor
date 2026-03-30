/**
 * Validation minimale de DATABASE_URL pour limiter injections et URLs manifestement invalides.
 * Note: localhost / 127.0.0.1 sont autorisés (installation self-hosted classique).
 * Seules les plages cloud-metadata et LAN privées sont bloquées.
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
        "Hôte cloud-metadata non autorisé. Utilisez l'IP ou le hostname réel de votre base.",
    };
  }
  return { ok: true };
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  // Autoriser localhost et 127.0.0.1 (self-hosted classique)
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return false;
  // Bloquer cloud-metadata
  if (h === "metadata.google.internal" || h.endsWith(".internal")) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  // Bloquer 169.254.x.x (link-local / AWS metadata)
  if (a === 169 && b === 254) return true;
  // Bloquer 100.64-127 (CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // Laisser passer 10.x, 172.16-31.x, 192.168.x (VPS / Docker / LAN légitimes)
  return false;
}
