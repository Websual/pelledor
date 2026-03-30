/**
 * Rate limiting for contact form (in-memory, 3 messages/hour per IP)
 */
const LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 heure

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export function checkContactRateLimit(ip: string): { allowed: boolean; remaining: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    return { allowed: true, remaining: LIMIT - 1 };
  }

  if (entry.resetAt < now) {
    store.delete(ip);
    return { allowed: true, remaining: LIMIT - 1 };
  }

  if (entry.count >= LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: LIMIT - entry.count - 1 };
}

export function incrementContactRateLimit(ip: string): void {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count++;
}
