import { notFound } from "next/navigation";
import { findInterviewByToken } from "@/server/interviews";
import { InterviewRoom } from "@/components/interview-room";
import { db } from "@/server/db";
import { completionTitle, type CompletionReason } from "@/domain/interview";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const interview = await findInterviewByToken(token);
  if (!interview) notFound();
  if (["completed", "processing", "report_failed"].includes(interview.status))
    return (
      <main className="interview-page">
        <div className="interview-shell">
          <section className="interview-card" style={{ textAlign: "center" }}>
            <div className="portrait" style={{ margin: "0 auto 1.5rem" }}>
              ✓
            </div>
            <h1 className="heading">
              {completionTitle(
                interview.completion_reason as CompletionReason | null,
              )}
            </h1>
            <p style={{ color: "var(--theme-neutral-300)" }}>
              {interview.completion_reason === "candidate_ended_early"
                ? `Your completed responses were saved, ${interview.candidate_name}. The company will see that the interview ended early.`
                : `Thank you, ${interview.candidate_name}. Your responses have been submitted to the company.`}
            </p>
          </section>
        </div>
      </main>
    );
  const rows =
    await db()`SELECT id,role,text FROM interview_turns WHERE candidate_interview_id=${interview.id} ORDER BY sequence_number`;
  const initialTurns = Array.from(rows, (row) => ({
    id: String(row.id),
    role: row.role as "candidate" | "interviewer",
    text: String(row.text),
  }));
  return (
    <InterviewRoom
      token={token}
      candidateName={interview.candidate_name}
      roleTitle={interview.title}
      initialStatus={interview.status}
      initialElapsed={interview.elapsed_seconds}
      initialTurns={initialTurns}
    />
  );
}
