// Node runtime only (node:crypto). Never import from proxy.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pw, salt, KEYLEN).toString("hex")}`;
}

const HEX_RE = /^[0-9a-f]+$/i;

/** `<salt_hex>:<hash_hex>` with a KEYLEN-byte hash: what hash-password prints. */
export function isValidStoredHash(stored: string | undefined): stored is string {
  if (!stored) return false;
  const [saltHex, hashHex, extra] = stored.split(":");
  if (!saltHex || !hashHex || extra !== undefined) return false;
  if (!HEX_RE.test(saltHex) || !HEX_RE.test(hashHex)) return false;
  return hashHex.length === KEYLEN * 2;
}

export function verifyPassword(pw: string, stored: string): boolean {
  if (!isValidStoredHash(stored)) return false;
  const [saltHex, hashHex] = stored.split(":");
  const actual = scryptSync(pw, Buffer.from(saltHex, "hex"), KEYLEN);
  return timingSafeEqual(actual, Buffer.from(hashHex, "hex"));
}
