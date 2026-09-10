import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CompanyShell } from "@/components/company-shell";
import { CandidateControls } from "@/components/candidate-controls";
import { CandidateStatus } from "@/components/candidate-status";
import { ReportView, type ReportData } from "@/components/report-view";
import { ReviewTranscript } from "@/components/review-transcript";
import { completionTitle, type CompletionReason } from "@/domain/interview";
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
  const [shared] =
    await db()`SELECT public_id FROM shared_reports WHERE candidate_interview_id=${id} AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`;
  const completionLabel = completionTitle(
    candidate.completion_reason as CompletionReason | null,
  );
  return (
    <CompanyShell email={session.user.email}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{candidate.title}</p>
          <h1 className="heading">{candidate.candidate_name}</h1>
          <p className="muted">{candidate.candidate_email}</p>
          <CandidateStatus
            status={candidate.status}
            completionReason={
              candidate.completion_reason as CompletionReason | null
            }
          />
        </div>
      </div>
      <CandidateControls
        candidate={{ id, status: candidate.status, report: candidate.report }}
        initialShare={{
          active: Boolean(shared),
          url: shared?.public_id
            ? `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/report/${shared.public_id}`
            : null,
        }}
      />
      <div className="stack candidate-review-content">
        <section className="card card-pad report-card">
          <p className="eyebrow">Report</p>
          {candidate.report ? (
            <ReportView report={candidate.report as ReportData} />
          ) : (
            <p className="muted">
              The evidence-backed report will appear after the interview.
            </p>
          )}
        </section>
        <ReviewTranscript
          candidateName={candidate.candidate_name}
          roleTitle={candidate.title}
          completionLabel={completionLabel}
          turns={turns.map((turn) => ({
            role: turn.role as "candidate" | "interviewer",
            text: String(turn.text),
            sequence_number: Number(turn.sequence_number),
          }))}
        />
      </div>
    </CompanyShell>
  );
}
