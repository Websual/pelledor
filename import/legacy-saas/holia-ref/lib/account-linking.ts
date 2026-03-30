// Cache pour stocker l'userId lors de la liaison de compte OAuth
// Utilisé pour forcer la liaison au compte de la session actuelle plutôt qu'au compte trouvé par email

interface LinkingEntry {
  userId: string;
  timestamp: number;
}

const linkingCache = new Map<string, LinkingEntry>();

// Nettoyer les entrées expirées (plus de 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of linkingCache.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) {
      linkingCache.delete(key);
    }
  }
}, 60 * 1000); // Nettoyer toutes les minutes

/**
 * Stocke l'userId pour une liaison de compte OAuth
 * @param token Token temporaire unique
 * @param userId ID de l'utilisateur à lier
 */
export function storeLinkingUserId(token: string, userId: string): void {
  linkingCache.set(token, { userId, timestamp: Date.now() });
}

/**
 * Récupère et supprime l'userId depuis le cache de liaison
 * @param token Token temporaire
 * @returns userId ou null si expiré/introuvable
 */
export function getLinkingUserId(token: string): string | null {
  const entry = linkingCache.get(token);
  if (!entry) return null;
  
  // Vérifier l'expiration
  if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
    linkingCache.delete(token);
    return null;
  }
  
  linkingCache.delete(token); // Utiliser une seule fois
  return entry.userId;
}
