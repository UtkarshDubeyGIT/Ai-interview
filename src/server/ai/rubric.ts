import { zodTextFormat } from "openai/helpers/zod";
import { rubricSchema, type Rubric } from "@/domain/rubric";
import { openai } from "./openai";

export async function generateRubric(input: {
  title: string;
  description: string;
  supportingDetails?: string;
}): Promise<Rubric> {
  const response = await openai().responses.parse({
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5.6-terra",
    reasoning: { effort: "low" },
    input: [
      {
        role: "system",
        content:
          "Create exactly four distinct job competencies with concise descriptions and integer weights totaling exactly 100. Return only the requested structure.",
      },
      { role: "user", content: JSON.stringify(input) },
    ],
    text: { format: zodTextFormat(rubricSchema, "interview_rubric") },
  });
  if (!response.output_parsed)
    throw new Error("Rubric generation returned no structured result");
  return rubricSchema.parse(response.output_parsed);
}
