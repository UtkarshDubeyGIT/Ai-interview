import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { hashSecretToken } from "@/server/security/tokens";

type SharedReport = {
  weightedScore: number;
  recommendation: string;
  summary: string;
  competencies: Array<{
    name: string;
    score: number;
    evidence: string[];
    missingEvidence: string[];
  }>;
};
export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [row] =
    await db()`SELECT c.candidate_name,c.report,j.title FROM shared_reports s JOIN candidate_interviews c ON c.id=s.candidate_interview_id JOIN jobs j ON j.id=c.job_id WHERE s.token_hash=${hashSecretToken(token)} AND s.revoked_at IS NULL AND c.status='completed'`;
  if (!row) notFound();
  const report = row.report as SharedReport;
  return (
    <main className="shell main">
      <div className="page-head">
        <div>
          <p className="eyebrow">Read-only interview report</p>
          <h1 className="heading">{row.candidate_name}</h1>
          <p className="muted">{row.title}</p>
        </div>
        <div className="brand">
          <span className="brand-mark">V</span>Violet Interview
        </div>
      </div>
      <section className="card card-pad stack">
        <div>
          <span className="weight">{report.weightedScore}</span>
          <h2 className="heading">{report.recommendation}</h2>
        </div>
        <p>{report.summary}</p>
        <div className="notice">Decision support—human review required.</div>
        <div className="grid grid-2">
          {report.competencies.map((c) => (
            <article className="card card-pad" key={c.name}>
              <p className="eyebrow">{c.score}/5</p>
              <h3 className="heading">{c.name}</h3>
              <p>{c.evidence.join(" · ") || "No supporting evidence"}</p>
              {c.missingEvidence.length > 0 && (
                <p className="muted">
                  Missing: {c.missingEvidence.join(" · ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
