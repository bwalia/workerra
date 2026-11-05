import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

// Seals a value into a cookie-safe string: JSON, compressed (OpsAPI's JWTs carry
// every permission and are ~5 KB raw), then AES-256-GCM, so the browser can
// neither read nor alter it. The key is derived from SESSION_SECRET.

const VERSION = "v1";
/** Browsers drop cookies over ~4 KB (name and attributes included). */
export const MAX_SEALED_LENGTH = 3800;

function key(secret: string): Buffer {
  return createHash("sha256").update(`workerra-session:${secret}`).digest();
}

export function seal(value: unknown, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([cipher.update(deflateRawSync(Buffer.from(JSON.stringify(value)))), cipher.final()]);
  return `${VERSION}.${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url")}`;
}

/** The sealed value, or null when it's missing, tampered with or sealed with another secret. */
export function unseal<T>(sealed: string | undefined, secret: string): T | null {
  if (!sealed?.startsWith(`${VERSION}.`)) return null;
  try {
    const raw = Buffer.from(sealed.slice(VERSION.length + 1), "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
    return JSON.parse(inflateRawSync(plain).toString()) as T;
  } catch {
    return null;
  }
}
