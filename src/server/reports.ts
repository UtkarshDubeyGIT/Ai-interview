import type { CompletionReason } from "@/domain/interview";
import { generateReport } from "@/server/ai/report";
import { db } from "@/server/db";

export async function createReport(id: string) {
  const [interview] = await db()`
    SELECT c.id,c.resume_text,c.completion_reason,j.rubric
    FROM candidate_interviews c
    JOIN jobs j ON j.id=c.job_id
    WHERE c.id=${id}
  `;
  if (!interview) return;

  const rows = await db()`
    SELECT role,text
    FROM interview_turns
    WHERE candidate_interview_id=${id}
    ORDER BY sequence_number
  `;
  const turns = Array.from(rows, (row) => ({
    role: String(row.role),
    text: String(row.text),
  }));

  try {
    const report = await generateReport({
      rubric: interview.rubric,
      turns,
      resumeText: interview.resume_text,
      completionReason:
        (interview.completion_reason as CompletionReason | null) ??
        "agent_completed",
    });
    await db()`
      UPDATE candidate_interviews
      SET report=${db().json(report)},status='completed',report_error=NULL,updated_at=now()
      WHERE id=${id} AND status='processing'
    `;
  } catch (error) {
    console.error("report_generation_failed", {
      interviewId: id,
      message: error instanceof Error ? error.message : "unknown",
    });
    await db()`
      UPDATE candidate_interviews
      SET status='report_failed',report_error='Report generation failed',updated_at=now()
      WHERE id=${id} AND status='processing'
    `;
  }
}
