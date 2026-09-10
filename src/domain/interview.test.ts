import { describe, expect, it } from "vitest";
import {
  canTransitionInterview,
  interviewTimingPhase,
  recommendationForScore,
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
});
