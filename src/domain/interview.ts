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
export const completionReasons = [
  "candidate_ended_early",
  "time_limit",
  "agent_completed",
] as const;
export type CompletionReason = (typeof completionReasons)[number];
export type SessionEndInitiator = "user" | "agent" | "network" | "error";

export const MINIMUM_COMPLETION_SECONDS = 12 * 60;

export function interviewTimingPhase(
  elapsedSeconds: number,
): InterviewTimingPhase {
  if (elapsedSeconds >= 900) return "complete";
  if (elapsedSeconds >= 810) return "wrap_up";
  return "active";
}

export function normalizeCompletionReason(
  requested: CompletionReason,
  elapsedSeconds: number,
): CompletionReason {
  if (elapsedSeconds >= 900) return "time_limit";
  if (elapsedSeconds >= MINIMUM_COMPLETION_SECONDS) return "agent_completed";
  return requested;
}

export function sessionEndCompletionReason(
  initiator: SessionEndInitiator,
  elapsedSeconds: number,
): CompletionReason | null {
  if (elapsedSeconds >= 900) return "time_limit";
  if (initiator === "agent" || elapsedSeconds >= MINIMUM_COMPLETION_SECONDS)
    return "agent_completed";
  return null;
}

export function completionTitle(reason: CompletionReason | null | undefined) {
  return reason === "candidate_ended_early"
    ? "Interview closed before completion"
    : "Interview complete";
}

export function candidateStatusPresentation(
  status: string,
  reason?: CompletionReason | null,
) {
  if (status === "completed" && reason === "candidate_ended_early")
    return {
      label: completionTitle(reason),
      tone: "attention",
    } as const;
  if (status === "completed")
    return { label: completionTitle(reason), tone: "complete" } as const;
  if (status === "in_progress")
    return { label: "Interview in progress", tone: "active" } as const;
  if (status === "processing")
    return { label: "Preparing report", tone: "active" } as const;
  if (status === "report_failed")
    return { label: "Report needs attention", tone: "attention" } as const;
  return { label: "Not started", tone: "pending" } as const;
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
