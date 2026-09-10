"use client";
import { Copy, UserCircle } from "@phosphor-icons/react";
import { useRef, useState } from "react";

export function CandidateForm({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [created, setCreated] = useState<{ id: string; inviteUrl: string }>();
  const linkInput = useRef<HTMLInputElement>(null);

  async function copyInvite() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.inviteUrl);
      setCopyMessage("Interview link copied.");
    } catch {
      linkInput.current?.select();
      setCopyMessage("Copy the selected link manually.");
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch(`/api/jobs/${jobId}/candidates`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Could not add candidate");
      setBusy(false);
      return;
    }
    setCreated(json);
    setBusy(false);
  }
  if (created)
    return (
      <section className="card card-pad stack">
        <p className="eyebrow">Private link ready</p>
        <h2 className="heading">Share this link with the candidate</h2>
        <p className="notice">
          This secret is shown once. Copy it before leaving this page.
        </p>
        <input
          className="input"
          ref={linkInput}
          readOnly
          value={created.inviteUrl}
          aria-label="Private interview link"
        />
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <button
            className="button button-primary"
            type="button"
            onClick={copyInvite}
          >
            <Copy size={18} aria-hidden="true" />
            Copy interview link
          </button>
          <a
            className="button button-secondary"
            href={`/candidates/${created.id}`}
          >
            <UserCircle size={18} aria-hidden="true" />
            View candidate
          </a>
        </div>
        <p className="copy-status" aria-live="polite">
          {copyMessage}
        </p>
      </section>
    );
  return (
    <form className="card card-pad stack" onSubmit={submit}>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="name">Candidate name</label>
          <input
            className="input"
            id="name"
            name="name"
            required
            maxLength={120}
          />
        </div>
        <div className="field">
          <label htmlFor="email">Candidate email</label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            required
            maxLength={320}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="resume">Résumé PDF</label>
        <input
          className="input"
          id="resume"
          name="resume"
          type="file"
          accept="application/pdf,.pdf"
          required
        />
        <small className="muted">
          PDF only, up to 5 MB. The original is never retained.
        </small>
      </div>
      <button className="button button-primary" disabled={busy}>
        {busy ? "Extracting résumé…" : "Create private interview link"}
      </button>
    </form>
  );
}
