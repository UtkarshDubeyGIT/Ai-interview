import { describe, expect, it } from "vitest";
import {
  buildSarvamAgentVariables,
  normalizeSarvamTranscript,
  sarvamAgentVersion,
} from "./sarvam";

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
      session_opening:
        "Welcome back, Aarav. This is Mira. Let’s continue your Platform Engineer interview where we left off.",
      session_instructions:
        "Continue this interview from the saved transcript without repeating the greeting or earlier questions. Use the remaining time for concise clarification questions that strengthen weak or incomplete evidence. Do not end the interview while useful clarification remains.",
    });
  });

  it("uses a fresh greeting only when there is no saved transcript", () => {
    const variables = buildSarvamAgentVariables({
      candidateName: "Aarav",
      jobTitle: "Platform Engineer",
      jobDescription: "Build reliable systems",
      rubric: { competencies: [] },
      resumeText: "",
      completedTurns: [],
      secondsRemaining: 900,
    });

    expect(variables.session_opening).toBe(
      "Hi Aarav, this is Mira. I’ll be conducting your interview for the Platform Engineer role. Ready to get started?",
    );
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

  it("uses a validated configured agent version", () => {
    expect(sarvamAgentVersion("7")).toBe(7);
    expect(sarvamAgentVersion(undefined)).toBe(2);
    expect(() => sarvamAgentVersion("latest")).toThrow("SARVAM_AGENT_VERSION");
  });
});
