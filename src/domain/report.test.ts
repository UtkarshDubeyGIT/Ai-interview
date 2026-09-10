import { describe, expect, it } from "vitest";
import { evaluationSchema, finalizeEvaluation } from "./report";

describe("structured evaluation", () => {
  const evaluation = {
    assessmentStatus: "scored" as const,
    summary: "The candidate explained two relevant delivery examples.",
    scoreRationale:
      "The résumé claim contributed only where the candidate defended it.",
    strengths: ["Clear ownership"],
    concerns: ["Limited scale evidence"],
    competencies: [
      {
        name: "Ownership",
        score: 5,
        evidence: ["Led rollout"],
        missingEvidence: [],
        resumeImpact: "The candidate defended the migration claim.",
      },
      {
        name: "Depth",
        score: 4,
        evidence: ["Explained trade-off"],
        missingEvidence: [],
        resumeImpact: "No material impact.",
      },
      {
        name: "Communication",
        score: 3,
        evidence: ["Structured answer"],
        missingEvidence: [],
        resumeImpact: "No material impact.",
      },
      {
        name: "Results",
        score: 2,
        evidence: [],
        missingEvidence: ["No metric"],
        resumeImpact: "The résumé metric was not defended.",
      },
    ],
    contradictions: [],
    resumeAlignment: {
      status: "mixed" as const,
      matches: [
        {
          resumeClaim: "Led a platform migration",
          candidateStatement: "I led the migration rollout.",
          evidence: ["Candidate: I led the migration rollout."],
        },
      ],
      mismatches: [],
      undefendedClaims: [
        {
          resumeClaim: "Improved latency by 40%",
          candidateStatement: "I do not remember the measurement.",
          evidence: ["Candidate: I do not remember the measurement."],
        },
      ],
    },
  };

  it("rejects model-supplied recommendations", () => {
    expect(
      evaluationSchema.safeParse({
        ...evaluation,
        recommendation: "Strong Yes",
      }).success,
    ).toBe(false);
  });

  it("computes the weighted score and recommendation on the server", () => {
    expect(
      finalizeEvaluation(evaluation, [40, 30, 20, 10], "agent_completed"),
    ).toMatchObject({
      assessmentStatus: "scored",
      weightedScore: 4,
      recommendation: "Yes",
      scoreRationale: expect.stringContaining("résumé"),
    });
  });

  it("does not invent a recommendation when evidence is insufficient", () => {
    expect(
      finalizeEvaluation(
        {
          ...evaluation,
          assessmentStatus: "insufficient_evidence",
          competencies: evaluation.competencies.map((competency) => ({
            ...competency,
            score: null,
          })),
        },
        [25, 25, 25, 25],
        "agent_completed",
      ),
    ).toMatchObject({
      assessmentStatus: "insufficient_evidence",
      recommendation: null,
      weightedScore: null,
    });
  });

  it("forces an early-close report to stay unscored", () => {
    expect(
      finalizeEvaluation(evaluation, [40, 30, 20, 10], "candidate_ended_early"),
    ).toMatchObject({
      assessmentStatus: "closed_early",
      recommendation: null,
      weightedScore: null,
      competencies: evaluation.competencies.map((competency) =>
        expect.objectContaining({ name: competency.name, score: null }),
      ),
    });
  });
  it("scores covered competencies without treating unexplored topics as zero", () => {
    const result = finalizeEvaluation(
      {
        ...evaluation,
        competencies: evaluation.competencies.map((c, i) => ({
          ...c,
          score: i < 2 ? 4 : null,
        })),
      },
      [25, 25, 25, 25],
      "agent_completed",
    );
    expect(result).toMatchObject({
      weightedScore: 4,
      evidenceCoverage: 50,
      screeningRecommendation: "in_person",
    });
  });
  it("does not reject on partial evidence even when observed scores are low", () => {
    const result = finalizeEvaluation(
      {
        ...evaluation,
        competencies: evaluation.competencies.map((c, i) => ({
          ...c,
          score: i < 2 ? 2 : null,
        })),
      },
      [25, 25, 25, 25],
      "agent_completed",
    );
    expect(result.screeningRecommendation).toBe("more_evidence");
  });
  it("withholds an overall score when only one competency was explored", () => {
    const result = finalizeEvaluation(
      {
        ...evaluation,
        competencies: evaluation.competencies.map((c, i) => ({
          ...c,
          score: i === 0 ? 4 : null,
        })),
      },
      [70, 10, 10, 10],
      "agent_completed",
    );
    expect(result).toMatchObject({
      weightedScore: null,
      screeningRecommendation: "more_evidence",
    });
  });
  it("requires documented concerns before a negative screening recommendation", () => {
    const low = {
      ...evaluation,
      concerns: [],
      competencies: evaluation.competencies.map((c) => ({
        ...c,
        score: 2,
        evidence: ["Incorrect explanation after clarification"],
      })),
    };
    expect(
      finalizeEvaluation(low, [25, 25, 25, 25], "agent_completed")
        .screeningRecommendation,
    ).toBe("more_evidence");
    expect(
      finalizeEvaluation(
        { ...low, concerns: ["Incorrect explanation after clarification"] },
        [25, 25, 25, 25],
        "agent_completed",
      ).screeningRecommendation,
    ).toBe("not_hireable");
  });
});
