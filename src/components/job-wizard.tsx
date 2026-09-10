"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Rubric } from "@/domain/rubric";

export function JobWizard() {
  const router = useRouter();
  const [rubric, setRubric] = useState<Rubric>();
  const [details, setDetails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries(form) as Record<string, string>;
    try {
      const response = await fetch("/api/rubrics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setDetails(input);
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
        />
      </div>
      <div className="field">
        <label htmlFor="description">Job description</label>
        <textarea
          className="input"
          id="description"
          name="description"
          required
          maxLength={12000}
          placeholder="Describe the work, outcomes, and level expected."
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
        />
      </div>
      <button className="button button-primary" disabled={busy}>
        {busy ? "Generating…" : "Generate rubric"}
      </button>
    </form>
  );
}
