"use client";
import { useState } from "react";

export function CandidateControls({
  candidate,
}: {
  candidate: { id: string; status: string; report: unknown };
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(action: string, method = "POST") {
    setBusy(true);
    const response = await fetch(`/api/candidates/${candidate.id}/${action}`, {
      method,
    });
    const json = await response.json().catch(() => ({}));
    if (response.ok) {
      if (json.url) {
        await navigator.clipboard.writeText(json.url);
        setMessage("Link copied to clipboard.");
      } else window.location.reload();
    } else setMessage(json.error ?? "Action failed");
    setBusy(false);
  }
  return (
    <section className="card card-pad">
      <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
        {candidate.status === "completed" && (
          <>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => act("share")}
            >
              Create or copy report link
            </button>
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => act("revoke")}
            >
              Revoke report link
            </button>
          </>
        )}{" "}
        {candidate.status === "report_failed" && (
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() => act("report")}
          >
            Retry report
          </button>
        )}
        <button
          className="button button-danger"
          disabled={busy}
          onClick={() => {
            if (confirm("Delete this candidate and all interview data?"))
              act("delete", "DELETE");
          }}
        >
          Delete candidate
        </button>
      </div>
      {message && (
        <p className="notice" style={{ marginTop: "1rem" }}>
          {message}
        </p>
      )}
    </section>
  );
}
