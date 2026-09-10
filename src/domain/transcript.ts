type TranscriptTurn = {
  role: "candidate" | "interviewer";
  text: string;
};

export function formatTranscriptText(input: {
  candidateName: string;
  roleTitle: string;
  completionLabel: string;
  turns: TranscriptTurn[];
}) {
  return [
    `Candidate: ${input.candidateName}`,
    `Role: ${input.roleTitle}`,
    `Status: ${input.completionLabel}`,
    "",
    ...input.turns.map(
      (turn) =>
        `${turn.role === "candidate" ? "Candidate" : "AI interviewer"}: ${turn.text}`,
    ),
    "",
  ].join("\n");
}

function filenamePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function transcriptFilename(candidateName: string, roleTitle: string) {
  const candidate = filenamePart(candidateName) || "candidate";
  const role = filenamePart(roleTitle) || "role";
  return `${candidate}-${role}-interview-transcript.txt`;
}
