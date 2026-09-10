import { describe, expect, it } from "vitest";
import { formatTranscriptText, transcriptFilename } from "./transcript";

describe("transcript text export", () => {
  it("includes metadata and ordered speaker-labelled turns", () => {
    expect(
      formatTranscriptText({
        candidateName: "Aarav Mehta",
        roleTitle: "Platform Engineer",
        completionLabel: "Interview complete",
        turns: [
          { role: "interviewer", text: "Tell me about the migration." },
          { role: "candidate", text: "I led it from planning to rollout." },
        ],
      }),
    ).toBe(
      [
        "Candidate: Aarav Mehta",
        "Role: Platform Engineer",
        "Status: Interview complete",
        "",
        "AI interviewer: Tell me about the migration.",
        "Candidate: I led it from planning to rollout.",
        "",
      ].join("\n"),
    );
  });

  it("creates a safe readable filename", () => {
    expect(transcriptFilename("Aarav Mehta", "Platform / Engineer")).toBe(
      "aarav-mehta-platform-engineer-interview-transcript.txt",
    );
  });
});
