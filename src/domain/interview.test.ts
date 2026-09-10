import { describe, expect, it } from "vitest";
import {
  candidateStatusPresentation,
  canTransitionInterview,
  completionTitle,
  interviewTimingPhase,
  normalizeCompletionReason,
  recommendationForScore,
  sessionEndCompletionReason,
  weightedScore,
} from "./interview";

describe("interview lifecycle", () => {
  it("permits the happy-path lifecycle", () => {
    expect(canTransitionInterview("not_started", "in_progress")).toBe(true);
    expect(canTransitionInterview("in_progress", "processing")).toBe(true);
    expect(canTransitionInterview("processing", "completed")).toBe(true);
  });

  it("rejects completion before processing", () => {
    expect(canTransitionInterview("not_started", "completed")).toBe(false);
    expect(canTransitionInterview("in_progress", "completed")).toBe(false);
  });

  it.each([
    [4.5, "Strong Yes"],
    [3.75, "Yes"],
    [2.75, "Mixed"],
    [2, "No"],
    [1.99, "Strong No"],
  ] as const)("maps %s to %s", (score, expected) => {
    expect(recommendationForScore(score)).toBe(expected);
  });

  it("computes a weighted score on the 1–5 scale", () => {
    expect(
      weightedScore([
        { score: 5, weight: 40 },
        { score: 4, weight: 30 },
        { score: 3, weight: 20 },
        { score: 2, weight: 10 },
      ]),
    ).toBe(4);
  });

  it.each([
    [0, "active"],
    [809, "active"],
    [810, "wrap_up"],
    [899, "wrap_up"],
    [900, "complete"],
  ] as const)("maps %s elapsed seconds to %s", (seconds, expected) => {
    expect(interviewTimingPhase(seconds)).toBe(expected);
  });

  it("distinguishes an interview closed by the candidate", () => {
    expect(normalizeCompletionReason("candidate_ended_early", 412)).toBe(
      "candidate_ended_early",
    );
    expect(completionTitle("candidate_ended_early")).toBe(
      "Interview closed before completion",
    );
  });

  it("treats a completion at the time limit as time_limit", () => {
    expect(normalizeCompletionReason("candidate_ended_early", 900)).toBe(
      "time_limit",
    );
    expect(completionTitle("time_limit")).toBe("Interview complete");
  });

  it("treats twelve completed minutes as a completed interview", () => {
    expect(normalizeCompletionReason("candidate_ended_early", 719)).toBe(
      "candidate_ended_early",
    );
    expect(normalizeCompletionReason("candidate_ended_early", 720)).toBe(
      "agent_completed",
    );
  });

  it("distinguishes a normal agent ending from an early connection loss", () => {
    expect(sessionEndCompletionReason("agent", 300)).toBe("agent_completed");
    expect(sessionEndCompletionReason("network", 719)).toBeNull();
    expect(sessionEndCompletionReason("network", 720)).toBe("agent_completed");
    expect(sessionEndCompletionReason("error", 900)).toBe("time_limit");
  });

  it("provides clear candidate status labels for company screens", () => {
    expect(candidateStatusPresentation("not_started")).toEqual({
      label: "Not started",
      tone: "pending",
    });
    expect(candidateStatusPresentation("in_progress")).toEqual({
      label: "Interview in progress",
      tone: "active",
    });
    expect(candidateStatusPresentation("completed", "agent_completed")).toEqual(
      {
        label: "Interview complete",
        tone: "complete",
      },
    );
    expect(
      candidateStatusPresentation("completed", "candidate_ended_early"),
    ).toEqual({
      label: "Interview closed before completion",
      tone: "attention",
    });
  });
});
