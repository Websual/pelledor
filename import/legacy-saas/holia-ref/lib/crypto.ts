import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "HOLIA_ENC:";

function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.ENCRYPTION_KEY?.trim();
  if (!keyHex || keyHex.length !== 64 || !/^[a-f0-9]+$/i.test(keyHex)) {
    return null;
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Chiffre un texte en AES-256-GCM.
 * Format stocké : HOLIA_ENC:{base64(iv:authTag:ciphertext)}
 */
export function encryptMessageContent(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY must be set in .env for message encryption. Generate with: openssl rand -hex 32"
    );
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return PREFIX + combined.toString("base64");
}

/**
 * Déchiffre un contenu de message.
 * Si le contenu n'est pas chiffré (legacy) ou si le déchiffrement échoue, retourne le contenu original.
 */
export function decryptMessageContent(content: string): string {
  if (!content || typeof content !== "string") return content;
  if (!content.startsWith(PREFIX)) return content; // Message non chiffré (legacy)

  try {
    const key = getEncryptionKey();
    if (!key) return content; // Clé non configurée : retourner tel quel (legacy)
    const combined = Buffer.from(content.slice(PREFIX.length), "base64");
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) return content;

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch {
    return content; // En cas d'erreur (clé invalide, données corrompues), retourner l'original
  }
}
