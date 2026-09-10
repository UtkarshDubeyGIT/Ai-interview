export type InterviewUiState =
  | "Ready"
  | "Connecting"
  | "Listening"
  | "Transcribing"
  | "Thinking"
  | "Speaking"
  | "Retrying"
  | "Complete";

export type AudioLevels = {
  input: number;
  output: number;
  inputAt: number;
  outputAt: number;
};

export const CANDIDATE_PROCESSING_GRACE_MS = 1200;

export function candidateProcessingState(silenceMs: number) {
  return silenceMs < CANDIDATE_PROCESSING_GRACE_MS
    ? ("Listening" as const)
    : ("Transcribing" as const);
}

export function activeInterviewState(state: InterviewUiState) {
  return ["Listening", "Transcribing", "Thinking", "Speaking"].includes(state);
}

export function showPreflightStartButton(
  consented: boolean,
  consentAccepted: boolean,
) {
  return !consented && consentAccepted;
}

export function barVisualizerState(state: InterviewUiState) {
  if (state === "Listening") return "listening" as const;
  if (state === "Speaking") return "speaking" as const;
  if (state === "Transcribing" || state === "Thinking")
    return "thinking" as const;
  return null;
}

export function orbState(state: InterviewUiState) {
  if (state === "Listening") return "listening" as const;
  if (state === "Speaking") return "talking" as const;
  if (state === "Transcribing" || state === "Thinking")
    return "thinking" as const;
  return null;
}

export function visualizerLevel(
  levels: AudioLevels,
  state: InterviewUiState,
  muted: boolean,
  now: number,
) {
  if (state === "Speaking") {
    return now - levels.outputAt > 250
      ? 0
      : Math.min(1, Math.max(0, levels.output * 5));
  }
  if (muted || state !== "Listening" || now - levels.inputAt > 250) return 0;
  return Math.min(1, Math.max(0, levels.input * 5));
}
