import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Gates the actions that change a household's week outcome (generating/
// resetting the week, manually reassigning a task's responsible member).
// Each household stores its own salted hash in
// `household.action_password_hash` — there is no shared/global password
// anymore (see openspec/changes/archive/... multi-tenant-households).
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// `scrypt` (Node built-in, no extra dependency) instead of bcrypt/argon2 —
// memory-hard KDF, zero install cost. Stored as "<saltHex>:<hashHex>".
export function hashActionPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const derived = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

// Fails closed: any malformed/missing stored hash verifies as false rather
// than throwing, so a corrupt or empty column never accidentally passes.
export function verifyActionPassword(
  password: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash) return false;
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const candidate = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(candidate, expected);
}
