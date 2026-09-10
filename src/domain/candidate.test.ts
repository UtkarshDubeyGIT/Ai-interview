import { describe, expect, it } from "vitest";
import { candidateUploadSchema, normalizeResumeText } from "./candidate";

describe("candidate upload", () => {
  it("accepts a PDF no larger than 5 MB", () => {
    expect(
      candidateUploadSchema.safeParse({
        name: "Aarav Mehta",
        email: "aarav@example.com",
        mimeType: "application/pdf",
        size: 5 * 1024 * 1024,
      }).success,
    ).toBe(true);
  });

  it("rejects non-PDF and oversized files", () => {
    expect(
      candidateUploadSchema.safeParse({
        name: "Aarav Mehta",
        email: "aarav@example.com",
        mimeType: "text/plain",
        size: 10,
      }).success,
    ).toBe(false);
    expect(
      candidateUploadSchema.safeParse({
        name: "Aarav Mehta",
        email: "aarav@example.com",
        mimeType: "application/pdf",
        size: 5 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
  });

  it("normalizes and caps extracted text at 20,000 characters", () => {
    expect(
      normalizeResumeText(`  hello  \n\n world ${"x".repeat(21_000)}`),
    ).toHaveLength(20_000);
  });
});
