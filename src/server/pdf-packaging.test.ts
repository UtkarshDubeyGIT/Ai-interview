import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("PDF parser server packaging", () => {
  it("loads pdf-parse from Node instead of bundling away its worker assets", () => {
    expect(nextConfig.serverExternalPackages).toContain("pdf-parse");
  });
});
