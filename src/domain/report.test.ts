import { describe, expect, it } from "vitest";
import { evaluationSchema, finalizeEvaluation } from "./report";

describe("structured evaluation", () => {
  const evaluation = {
    summary: "The candidate explained two relevant delivery examples.",
    strengths: ["Clear ownership"],
    concerns: ["Limited scale evidence"],
    insufficientEvidence: false,
    competencies: [
      {
        name: "Ownership",
        score: 5,
        evidence: ["Led rollout"],
        missingEvidence: [],
      },
      {
        name: "Depth",
        score: 4,
        evidence: ["Explained trade-off"],
        missingEvidence: [],
      },
      {
        name: "Communication",
        score: 3,
        evidence: ["Structured answer"],
        missingEvidence: [],
      },
      {
        name: "Results",
        score: 2,
        evidence: [],
        missingEvidence: ["No metric"],
      },
    ],
    contradictions: [],
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
    expect(finalizeEvaluation(evaluation, [40, 30, 20, 10])).toMatchObject({
      weightedScore: 4,
      recommendation: "Yes",
    });
  });

  it("does not invent a recommendation when evidence is insufficient", () => {
    expect(
      finalizeEvaluation(
        { ...evaluation, insufficientEvidence: true },
        [25, 25, 25, 25],
      ),
    ).toMatchObject({
      recommendation: "Insufficient evidence",
      weightedScore: null,
    });
  });
});
