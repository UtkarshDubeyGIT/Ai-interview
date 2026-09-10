import { z } from "zod";
import { recommendationForScore, weightedScore } from "./interview";

const competencyEvaluationSchema = z.object({
  name: z.string().min(1),
  score: z.number().int().min(1).max(5),
  evidence: z.array(z.string().min(1)),
  missingEvidence: z.array(z.string().min(1)),
});

export const evaluationSchema = z
  .object({
    summary: z.string().min(1),
    strengths: z.array(z.string().min(1)),
    concerns: z.array(z.string().min(1)),
    insufficientEvidence: z.boolean(),
    competencies: z.array(competencyEvaluationSchema).length(4),
    contradictions: z.array(z.string().min(1)),
  })
  .strict();

export type Evaluation = z.infer<typeof evaluationSchema>;

export function finalizeEvaluation(
  evaluation: Evaluation,
  weights: readonly number[],
) {
  const parsed = evaluationSchema.parse(evaluation);
  if (parsed.insufficientEvidence) {
    return {
      ...parsed,
      weightedScore: null,
      recommendation: "Insufficient evidence" as const,
    };
  }
  const score = weightedScore(
    parsed.competencies.map((competency, index) => ({
      score: competency.score,
      weight: weights[index] ?? 0,
    })),
  );
  return {
    ...parsed,
    weightedScore: Math.round(score * 100) / 100,
    recommendation: recommendationForScore(score),
  };
}
