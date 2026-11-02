import crypto from "crypto";

/**
 * Hash a plaintext password using crypto.scrypt with a random 16-byte salt.
 * Format: `${salt}:${hash}`
 */
export function hashPassword(password) {
  if (!password) return "";
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a stored hash or legacy plaintext string.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyPassword(password, stored) {
  if (!stored || !password) return false;

  // Legacy plaintext fallback for backwards compatibility with pre-audit accounts
  if (!stored.includes(":")) {
    const passwordBuf = Buffer.from(password);
    const storedBuf = Buffer.from(stored);
    if (passwordBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(passwordBuf, storedBuf);
  }

  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const testHashBuf = Buffer.from(testHash, "hex");

  if (hashBuf.length !== testHashBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, testHashBuf);
}
