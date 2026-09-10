import { z } from "zod";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_RESUME_CHARACTERS = 20_000;
export const MAX_JOB_DESCRIPTION_CHARACTERS = 12_000;

export const candidateUploadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  mimeType: z.literal("application/pdf"),
  size: z.number().int().positive().max(MAX_RESUME_BYTES),
});

export const jobDescriptionUploadSchema = z.object({
  mimeType: z.literal("application/pdf"),
  size: z.number().int().positive().max(MAX_RESUME_BYTES),
});

function normalizeExtractedDocumentText(text: string, maxCharacters: number) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\f/g, "\n\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter(
      (line) =>
        !/^(?:-{1,3}\s*)?(?:page\s+)?\d+\s+(?:of|\/)\s+\d+(?:\s*-{1,3})?$/i.test(
          line,
        ),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxCharacters)
    .trimEnd();
}

export function normalizeResumeText(text: string) {
  return normalizeExtractedDocumentText(text, MAX_RESUME_CHARACTERS);
}

export function normalizeJobDescriptionText(text: string) {
  return normalizeExtractedDocumentText(text, MAX_JOB_DESCRIPTION_CHARACTERS);
}
