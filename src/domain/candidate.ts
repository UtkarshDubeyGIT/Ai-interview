import { z } from "zod";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_RESUME_CHARACTERS = 20_000;

export const candidateUploadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  mimeType: z.literal("application/pdf"),
  size: z.number().int().positive().max(MAX_RESUME_BYTES),
});

export function normalizeResumeText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_RESUME_CHARACTERS);
}
