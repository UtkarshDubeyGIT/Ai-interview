import { PDFParse } from "pdf-parse";
import {
  normalizeJobDescriptionText,
  normalizeResumeText,
} from "@/domain/candidate";

async function extractPdfText(
  bytes: Uint8Array,
  normalize: (text: string) => string,
) {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return normalize(result.text);
  } finally {
    await parser.destroy();
  }
}

export function extractResumeText(bytes: Uint8Array) {
  return extractPdfText(bytes, normalizeResumeText);
}

export function extractJobDescriptionText(bytes: Uint8Array) {
  return extractPdfText(bytes, normalizeJobDescriptionText);
}
