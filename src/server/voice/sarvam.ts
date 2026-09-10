type TranscriptRole = "candidate" | "interviewer";

type InterviewContext = {
  candidateName: string;
  jobTitle: string;
  jobDescription: string;
  rubric: unknown;
  resumeText: string;
  completedTurns: Array<{ role: TranscriptRole; text: string }>;
  secondsRemaining: number;
};

export function sarvamAgentVersion(value: string | undefined) {
  if (value === undefined || value === "") return 2;
  const version = Number(value);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("SARVAM_AGENT_VERSION must be a positive integer");
  }
  return version;
}

export function buildSarvamAgentVariables(context: InterviewContext) {
  const completedTranscript = context.completedTurns
    .map(
      (turn) =>
        `${turn.role === "candidate" ? "Candidate" : "Interviewer"}: ${turn.text}`,
    )
    .join("\n");

  return {
    candidate_name: context.candidateName,
    job_title: context.jobTitle,
    job_description: context.jobDescription,
    rubric_json: JSON.stringify(context.rubric),
    resume_text: context.resumeText,
    completed_transcript: completedTranscript,
    seconds_remaining: String(Math.max(0, context.secondsRemaining)),
    session_opening: completedTranscript
      ? `Welcome back, ${context.candidateName}. This is Mira. Let’s continue your ${context.jobTitle} interview where we left off.`
      : `Hi ${context.candidateName}, this is Mira. I’ll be conducting your interview for the ${context.jobTitle} role. Ready to get started?`,
    session_instructions: completedTranscript
      ? "Continue this interview from the saved transcript without repeating the greeting or earlier questions. Use the remaining time for concise clarification questions that strengthen weak or incomplete evidence. Do not end the interview while useful clarification remains."
      : "Use the available time for concise clarification questions that strengthen weak or incomplete evidence. Do not end the interview while useful clarification remains.",
  };
}

export function normalizeSarvamTranscript(input: {
  role: "user" | "bot";
  content: string;
}): { role: TranscriptRole; text: string } | null {
  const text = input.content.trim();
  if (!text) return null;

  return {
    role: input.role === "user" ? "candidate" : "interviewer",
    text,
  };
}
