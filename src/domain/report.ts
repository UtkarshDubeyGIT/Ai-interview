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
      scores.every((score) => score === null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["competencies"],
        message: "Scored reports require at least one observed competency",
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
  const observed = parsed.competencies.flatMap((c, index) =>
    c.score === null ? [] : [{ score: c.score, weight: weights[index] ?? 0 }],
  );
  const coverage = observed.reduce((sum, c) => sum + c.weight, 0);
  const metadata = {
    evaluationVersion: 2,
    evidenceCoverage: coverage,
    generatedAt: new Date().toISOString(),
  };
  if (
    parsed.assessmentStatus !== "scored" ||
    observed.length < 2 ||
    coverage < 50
  ) {
    return {
      ...parsed,
      ...metadata,
      assessmentStatus: early
        ? ("closed_early" as const)
        : ("insufficient_evidence" as const),
      screeningRecommendation: "more_evidence" as const,
      weightedScore: null,
      recommendation: null,
    };
  }
  const score = weightedScore(
    observed.map((c) => ({ ...c, weight: (c.weight * 100) / coverage })),
  );
  const screeningRecommendation =
    score >= 3
      ? ("in_person" as const)
      : observed.length === 4 &&
          parsed.concerns.length > 0 &&
          parsed.competencies.every((c) => c.evidence.length > 0)
        ? ("not_hireable" as const)
        : ("more_evidence" as const);
  return {
    ...parsed,
    ...metadata,
    screeningRecommendation,
    weightedScore: Math.round(score * 100) / 100,
    recommendation: recommendationForScore(score),
  };
}
