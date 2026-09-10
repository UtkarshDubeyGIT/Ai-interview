import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CompanyShell } from "@/components/company-shell";
import { CandidateControls } from "@/components/candidate-controls";
import { db } from "@/server/db";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const [candidate] =
    await db()`SELECT c.*,j.title,j.rubric FROM candidate_interviews c JOIN jobs j ON j.id=c.job_id WHERE c.id=${id} AND j.owner_id=${session.user.id}`;
  if (!candidate) notFound();
  const turns =
    await db()`SELECT role,text,sequence_number FROM interview_turns WHERE candidate_interview_id=${id} ORDER BY sequence_number`;
  return (
    <CompanyShell email={session.user.email}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{candidate.title}</p>
          <h1 className="heading">{candidate.candidate_name}</h1>
          <p className="muted">
            {candidate.candidate_email} ·{" "}
            <span className={`status status-${candidate.status}`}>
              {String(candidate.status).replaceAll("_", " ")}
            </span>
          </p>
        </div>
      </div>
      <CandidateControls
        candidate={{ id, status: candidate.status, report: candidate.report }}
      />
      <div className="grid grid-2" style={{ marginTop: "1rem" }}>
        <section className="card card-pad">
          <p className="eyebrow">Report</p>
          {candidate.report ? (
            <Report report={candidate.report} />
          ) : (
            <p className="muted">
              The evidence-backed report will appear after the interview.
            </p>
          )}
        </section>
        <section className="card card-pad">
          <p className="eyebrow">Transcript · {turns.length} turns</p>
          {turns.length ? (
            turns.map((turn) => (
              <div
                key={turn.sequence_number}
                style={{
                  padding: ".8rem 0",
                  borderBottom: "1px solid var(--theme-border-subtle)",
                }}
              >
                <strong>
                  {turn.role === "candidate"
                    ? candidate.candidate_name
                    : "Mira"}
                </strong>
                <p className="muted" style={{ margin: 0 }}>
                  {turn.text}
                </p>
              </div>
            ))
          ) : (
            <p className="muted">No completed turns yet.</p>
          )}
        </section>
      </div>
    </CompanyShell>
  );
}

type ReportData = {
  weightedScore: number | null;
  recommendation: string;
  summary: string;
  competencies?: Array<{ name: string; score: number; evidence: string[] }>;
};
function Report({ report }: { report: ReportData }) {
  return (
    <div className="stack">
      <div>
        <span className="weight">{report.weightedScore ?? "—"}</span>
        <p>{report.recommendation}</p>
      </div>
      <p>{report.summary}</p>
      <div className="notice">Decision support—human review required.</div>
      {report.competencies?.map((c) => (
        <div key={c.name}>
          <strong>
            {c.name} · {c.score}/5
          </strong>
          <p className="muted">
            {c.evidence?.join(" · ") || "No supporting evidence"}
          </p>
        </div>
      ))}
    </div>
  );
}
