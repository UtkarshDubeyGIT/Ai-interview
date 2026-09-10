import { describe, expect, it } from "vitest";
import { createSecretToken, hashSecretToken, tokenMatchesHash } from "./tokens";

describe("secret links", () => {
  it("creates a 256-bit URL-safe random token and stores only a hash", () => {
    const token = createSecretToken();
    const hash = hashSecretToken(token);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(hash).not.toContain(token);
    expect(tokenMatchesHash(token, hash)).toBe(true);
  });

  it("rejects a different token", () => {
    expect(
      tokenMatchesHash(
        createSecretToken(),
        hashSecretToken(createSecretToken()),
      ),
    ).toBe(false);
  });
});
