/**
 * Cache Redis optionnel pour l'API.
 * Si REDIS_URL n'est pas défini, get retourne null et set ne fait rien (pas d'erreur).
 */

import Redis from "ioredis";

let client: Redis | null = null;

function getClient(): Redis | null {
  if (client !== null) return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    client.on("error", () => {});
    return client;
  } catch {
    return null;
  }
}

const PREFIX = "holia:";

/** Récupère une valeur en cache. Retourne null si pas de Redis ou clé absente. */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(PREFIX + key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Enregistre une valeur en cache avec TTL en secondes. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    const fullKey = PREFIX + key;
    await redis.set(fullKey, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignore
  }
}

/** Ferme la connexion (pour scripts ou tests). */
export async function redisDisconnect(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
