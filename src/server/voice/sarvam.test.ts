import { describe, expect, it } from "vitest";
import { buildSarvamAgentVariables, normalizeSarvamTranscript } from "./sarvam";

describe("Sarvam voice adapter", () => {
  it("builds the committed agent variables from trusted interview context", () => {
    const variables = buildSarvamAgentVariables({
      candidateName: "Aarav",
      jobTitle: "Platform Engineer",
      jobDescription: "Build reliable systems",
      rubric: { competencies: [{ name: "Ownership", weight: 100 }] },
      resumeText: "Experience with distributed systems",
      completedTurns: [{ role: "candidate", text: "I led the migration." }],
      secondsRemaining: 740,
    });

    expect(variables).toEqual({
      candidate_name: "Aarav",
      job_title: "Platform Engineer",
      job_description: "Build reliable systems",
      rubric_json: JSON.stringify({
        competencies: [{ name: "Ownership", weight: 100 }],
      }),
      resume_text: "Experience with distributed systems",
      completed_transcript: "Candidate: I led the migration.",
      seconds_remaining: "740",
    });
  });

  it("normalizes provider roles and rejects empty transcripts", () => {
    expect(
      normalizeSarvamTranscript({ role: "user", content: "  My answer  " }),
    ).toEqual({ role: "candidate", text: "My answer" });
    expect(
      normalizeSarvamTranscript({ role: "bot", content: "Next question" }),
    ).toEqual({ role: "interviewer", text: "Next question" });
    expect(
      normalizeSarvamTranscript({ role: "bot", content: "   " }),
    ).toBeNull();
  });
});
