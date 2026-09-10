import { z } from "zod";
import {
  recommendationForScore,
  weightedScore,
  type CompletionReason,
} from "./interview";

const resumeFindingSchema = z.object({
  resumeClaim: z.string().min(1),
  candidateStatement: z.string().min(1),
  evidence: z.array(z.string().min(1)),
});

const competencyEvaluationSchema = z.object({
  name: z.string().min(1),
  score: z.number().int().min(1).max(5).nullable(),
  evidence: z.array(z.string().min(1)),
  missingEvidence: z.array(z.string().min(1)),
  resumeImpact: z.string().min(1),
});

export const evaluationSchema = z
  .object({
    assessmentStatus: z.enum([
      "scored",
      "insufficient_evidence",
      "closed_early",
    ]),
    summary: z.string().min(1),
    scoreRationale: z.string().min(1),
    strengths: z.array(z.string().min(1)),
    concerns: z.array(z.string().min(1)),
    competencies: z.array(competencyEvaluationSchema).length(4),
    contradictions: z.array(z.string().min(1)),
    resumeAlignment: z.object({
      status: z.enum(["aligned", "mixed", "misaligned", "not_assessed"]),
      matches: z.array(resumeFindingSchema),
      mismatches: z.array(resumeFindingSchema),
      undefendedClaims: z.array(resumeFindingSchema),
    }),
  })
  .superRefine((evaluation, context) => {
    const scores = evaluation.competencies.map((item) => item.score);
    if (
      evaluation.assessmentStatus === "scored" &&
      scores.some((score) => score === null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["competencies"],
        message: "Scored reports require four competency scores",
      });
    }
    if (
      evaluation.assessmentStatus !== "scored" &&
      scores.some((score) => score !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["competencies"],
        message: "Unscored reports cannot contain competency scores",
      });
    }
  })
  .strict();

export type Evaluation = z.infer<typeof evaluationSchema>;

export function finalizeEvaluation(
  evaluation: Evaluation,
  weights: readonly number[],
  completionReason: CompletionReason,
) {
  const early = completionReason === "candidate_ended_early";
  const prepared = early
    ? {
        ...evaluation,
        assessmentStatus: "closed_early" as const,
        competencies: evaluation.competencies.map((competency) => ({
          ...competency,
          score: null,
        })),
      }
    : evaluation;
  const parsed = evaluationSchema.parse(prepared);
  if (parsed.assessmentStatus !== "scored") {
    return {
      ...parsed,
      weightedScore: null,
      recommendation: null,
    };
  }
  const score = weightedScore(
    parsed.competencies.map((competency, index) => ({
      score: competency.score!,
      weight: weights[index] ?? 0,
    })),
  );
  return {
    ...parsed,
    weightedScore: Math.round(score * 100) / 100,
    recommendation: recommendationForScore(score),
  };
}
