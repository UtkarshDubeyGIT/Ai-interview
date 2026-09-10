"use client";

import { FilePdf, UploadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Rubric } from "@/domain/rubric";

export function JobWizard() {
  const router = useRouter();
  const [rubric, setRubric] = useState<Rubric>();
  const [details, setDetails] = useState({
    title: "",
    description: "",
    supportingDetails: "",
  });
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [pendingDescription, setPendingDescription] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function extractDescription(file: File) {
    setExtracting(true);
    setError("");
    setUploadMessage("");
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/jobs/description/extract", {
        method: "POST",
        body,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Could not read PDF");
      if (details.description.trim()) {
        setPendingDescription(json.text);
        setUploadMessage(
          "A description is already entered. Choose whether to replace it with the PDF text.",
        );
      } else {
        setDetails((current) => ({ ...current, description: json.text }));
        setUploadMessage(`Imported ${file.name}. Review the text below.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read PDF");
    } finally {
      setExtracting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rubrics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(details),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setRubric(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate rubric");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...details, rubric }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save role");
      setBusy(false);
    }
  }
  if (rubric)
    return (
      <section className="card card-pad">
        <p className="eyebrow">Rubric preview</p>
        <h2 className="heading">Four signals for {details.title}</h2>
        <p className="muted">
          Review the generated rubric. Regenerate it if the emphasis feels
          wrong.
        </p>
        {rubric.competencies.map((c) => (
          <div className="rubric-row" key={c.name}>
            <div>
              <strong>{c.name}</strong>
              <p className="muted" style={{ margin: 0 }}>
                {c.description}
              </p>
            </div>
            <span className="weight">{c.weight}%</span>
          </div>
        ))}
        {error && <p className="error">{error}</p>}
        <div
          style={{
            display: "flex",
            gap: ".75rem",
            marginTop: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            className="button button-primary"
            onClick={save}
            disabled={busy}
          >
            {busy ? "Saving…" : "Save role"}
          </button>
          <button
            className="button button-secondary"
            onClick={() => setRubric(undefined)}
            disabled={busy}
          >
            Change details
          </button>
        </div>
      </section>
    );
  return (
    <form className="card card-pad stack" onSubmit={generate}>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <label htmlFor="title">Job title</label>
        <input
          className="input"
          id="title"
          name="title"
          required
          maxLength={120}
          placeholder="Senior Platform Engineer"
          value={details.title}
          onChange={(event) =>
            setDetails((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
        />
      </div>
      <div className="field">
        <label htmlFor="description">Job description</label>
        <div
          className="pdf-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) void extractDescription(file);
          }}
        >
          <FilePdf size={28} aria-hidden="true" />
          <div>
            <strong>Import a job-description PDF</strong>
            <span>Drop it here or choose a file · PDF up to 5 MB</span>
          </div>
          <label
            className="button button-secondary pdf-picker"
            htmlFor="job-pdf"
          >
            <UploadSimple size={18} aria-hidden="true" />
            {extracting ? "Reading…" : "Choose PDF"}
          </label>
          <input
            ref={fileInput}
            className="visually-hidden"
            id="job-pdf"
            type="file"
            accept="application/pdf,.pdf"
            disabled={extracting}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void extractDescription(file);
            }}
          />
        </div>
        {uploadMessage && (
          <div className="notice inline-choice" aria-live="polite">
            <span>{uploadMessage}</span>
            {pendingDescription && (
              <span className="inline-actions">
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setDetails((current) => ({
                      ...current,
                      description: pendingDescription,
                    }));
                    setPendingDescription("");
                    setUploadMessage("PDF text imported. Review it below.");
                  }}
                >
                  Replace text
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setPendingDescription("");
                    setUploadMessage("Existing description kept.");
                  }}
                >
                  Keep existing
                </button>
              </span>
            )}
          </div>
        )}
        <textarea
          className="input"
          id="description"
          name="description"
          required
          maxLength={12000}
          placeholder="Describe the work, outcomes, and level expected."
          value={details.description}
          onChange={(event) =>
            setDetails((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
        />
      </div>
      <div className="field">
        <label htmlFor="supportingDetails">
          Supporting details <span className="muted">optional</span>
        </label>
        <textarea
          className="input"
          id="supportingDetails"
          name="supportingDetails"
          maxLength={4000}
          placeholder="Team context, stack, or priorities"
          value={details.supportingDetails}
          onChange={(event) =>
            setDetails((current) => ({
              ...current,
              supportingDetails: event.target.value,
            }))
          }
        />
      </div>
      <button className="button button-primary" disabled={busy || extracting}>
        {busy ? "Generating…" : "Generate rubric"}
      </button>
    </form>
  );
}
