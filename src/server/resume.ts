import { PDFParse } from "pdf-parse";
import { normalizeResumeText } from "@/domain/candidate";

export async function extractResumeText(bytes: Uint8Array) {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return normalizeResumeText(result.text);
  } finally {
    await parser.destroy();
  }
}
