export const interviewStatuses = [
  "not_started",
  "in_progress",
  "processing",
  "completed",
  "report_failed",
] as const;

export type InterviewStatus = (typeof interviewStatuses)[number];
export type Recommendation =
  "Strong Yes" | "Yes" | "Mixed" | "No" | "Strong No";
export type InterviewTimingPhase = "active" | "wrap_up" | "complete";

export function interviewTimingPhase(
  elapsedSeconds: number,
): InterviewTimingPhase {
  if (elapsedSeconds >= 900) return "complete";
  if (elapsedSeconds >= 810) return "wrap_up";
  return "active";
}

const transitions: Record<InterviewStatus, readonly InterviewStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["processing"],
  processing: ["completed", "report_failed"],
  completed: [],
  report_failed: ["processing"],
};

export function canTransitionInterview(
  from: InterviewStatus,
  to: InterviewStatus,
) {
  return transitions[from].includes(to);
}

export function weightedScore(
  scores: ReadonlyArray<{ score: number; weight: number }>,
) {
  return scores.reduce(
    (total, item) => total + item.score * (item.weight / 100),
    0,
  );
}

export function recommendationForScore(score: number): Recommendation {
  if (score >= 4.5) return "Strong Yes";
  if (score >= 3.75) return "Yes";
  if (score >= 2.75) return "Mixed";
  if (score >= 2) return "No";
  return "Strong No";
}
