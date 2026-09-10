import { PrintReport } from "@/components/print-report";
import { BrandLogo } from "@/components/brand-logo";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { hashSecretToken } from "@/server/security/tokens";
import { ReportView, type ReportData } from "@/components/report-view";
export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = hashSecretToken(token);
  const [row] = await db()`
    SELECT c.candidate_name,c.report,c.completion_reason,j.title
    FROM shared_reports s
    JOIN candidate_interviews c ON c.id=s.candidate_interview_id
    JOIN jobs j ON j.id=c.job_id
    WHERE (s.public_id=${token} OR s.token_hash=${tokenHash})
      AND s.revoked_at IS NULL
      AND c.status='completed'
  `;
  if (!row) notFound();
  const report = row.report as ReportData;
  return (
    <main className="shell main">
      <div className="page-head">
        <div>
          <p className="eyebrow">Read-only interview report</p>
          <h1 className="heading">{row.candidate_name}</h1>
          <p className="muted">{row.title}</p>
        </div>
        <div className="brand">
          <BrandLogo />
        </div>
      </div>
      <PrintReport />
      <section className="card card-pad report-card">
        <ReportView report={report} />
      </section>
    </main>
  );
}
