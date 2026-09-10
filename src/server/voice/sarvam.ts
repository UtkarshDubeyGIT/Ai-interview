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
