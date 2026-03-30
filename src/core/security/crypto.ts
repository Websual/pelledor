import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const SALT_LEN = 16;
const KEY_LEN = 32;

function keyFromEncryptionKey(encryptionKeyHex: string): Buffer {
  const raw = Buffer.from(encryptionKeyHex, "hex");
  if (raw.length === KEY_LEN) return raw;
  return scryptSync(encryptionKeyHex, "saas-os", KEY_LEN);
}

/**
 * Encrypt plaintext with ENCRYPTION_KEY from env (64 hex chars = 32 bytes).
 * Returns base64(iv || ciphertext+authTag)
 */
export function encryptSecret(plaintext: string, encryptionKeyHex: string): string {
  const key = keyFromEncryptionKey(encryptionKeyHex);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return Buffer.concat([iv, enc]).toString("base64");
}

export function decryptSecret(payloadB64: string, encryptionKeyHex: string): string {
  const key = keyFromEncryptionKey(encryptionKeyHex);
  const buf = Buffer.from(payloadB64, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - 16);
  const ciphertext = buf.subarray(IV_LEN, buf.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

export function generateEncryptionKeyHex(): string {
  return randomBytes(KEY_LEN).toString("hex");
}

export function generateAuthSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function generateSalt(): string {
  return randomBytes(SALT_LEN).toString("hex");
}
