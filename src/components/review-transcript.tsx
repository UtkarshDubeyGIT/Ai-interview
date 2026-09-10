"use client";

import {
  CaretDown,
  DownloadSimple,
  TextAlignLeft,
} from "@phosphor-icons/react";
import { useState } from "react";
import { formatTranscriptText, transcriptFilename } from "@/domain/transcript";

type Turn = {
  role: "candidate" | "interviewer";
  text: string;
  sequence_number: number;
};

export function ReviewTranscript({
  candidateName,
  roleTitle,
  completionLabel,
  turns,
}: {
  candidateName: string;
  roleTitle: string;
  completionLabel: string;
  turns: Turn[];
}) {
  const [open, setOpen] = useState(false);

  function download() {
    const contents = formatTranscriptText({
      candidateName,
      roleTitle,
      completionLabel,
      turns,
    });
    const url = URL.createObjectURL(
      new Blob([contents], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = transcriptFilename(candidateName, roleTitle);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  return (
    <section className="card transcript-review">
      <div className="transcript-review-head">
        <button
          className="transcript-toggle"
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <TextAlignLeft size={21} />
          <span>
            <strong>Interview transcript</strong>
            <small>
              {turns.length} turns · {open ? "Hide" : "Show"}
            </small>
          </span>
          <CaretDown className={open ? "rotated" : ""} size={18} />
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={download}
          disabled={!turns.length}
        >
          <DownloadSimple size={17} /> Download TXT
        </button>
      </div>
      {open && (
        <div className="transcript-turns">
          {turns.length ? (
            turns.map((turn) => (
              <article key={turn.sequence_number}>
                <strong>
                  {turn.role === "candidate" ? candidateName : "Mira"}
                </strong>
                <p>{turn.text}</p>
              </article>
            ))
          ) : (
            <p className="muted">No completed turns yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
