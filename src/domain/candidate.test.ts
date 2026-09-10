import { describe, expect, it } from "vitest";
import {
  candidateUploadSchema,
  jobDescriptionUploadSchema,
  normalizeJobDescriptionText,
  normalizeResumeText,
} from "./candidate";

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

  it("preserves résumé headings, bullets, and paragraph boundaries", () => {
    expect(
      normalizeResumeText(
        "  EXPERIENCE  \r\n\r\n  Platform Engineer  \r\n  •   Built reliable systems  \r\n  -   Reduced latency by 30%  \r\n\r\n\r\n  EDUCATION  ",
      ),
    ).toBe(
      "EXPERIENCE\n\nPlatform Engineer\n• Built reliable systems\n- Reduced latency by 30%\n\nEDUCATION",
    );
  });

  it("removes isolated PDF page counters", () => {
    expect(
      normalizeResumeText(
        "EXPERIENCE\nBuilt reliable systems\n-- 1 of 2 --\nEDUCATION\nPage 2 of 2",
      ),
    ).toBe("EXPERIENCE\nBuilt reliable systems\nEDUCATION");
  });

  it("accepts a job-description PDF up to 5 MB", () => {
    expect(
      jobDescriptionUploadSchema.safeParse({
        mimeType: "application/pdf",
        size: 5 * 1024 * 1024,
      }).success,
    ).toBe(true);
  });

  it("normalizes job-description text to the role limit", () => {
    expect(
      normalizeJobDescriptionText(`  Build systems\n\n${"x".repeat(13_000)}`),
    ).toHaveLength(12_000);
  });
});
