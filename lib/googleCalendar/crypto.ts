/**
 * SERVER ONLY. AES-256-GCM sealing for Google refresh tokens and the
 * short-lived OAuth state cookie (Mission 11).
 *
 * Format: v1.<iv>.<authTag>.<ciphertext> (base64url parts).
 * `context` is used as additional authenticated data so a value sealed for
 * one purpose/user cannot be replayed for another.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;

export function seal(plaintext: string, key: Buffer, context: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/** Returns null when the value is malformed, tampered, or sealed for another context. */
export function unseal(
  sealed: string,
  key: Buffer,
  context: string,
): string | null {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;

  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
