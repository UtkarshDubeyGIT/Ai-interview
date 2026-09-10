import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createSecretToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSecretToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokenMatchesHash(token: string, expectedHash: string) {
  const actual = Buffer.from(hashSecretToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
