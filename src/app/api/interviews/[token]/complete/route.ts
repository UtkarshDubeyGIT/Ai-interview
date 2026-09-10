import { NextResponse } from "next/server";
import { z } from "zod";
import { generateReport } from "@/server/ai/report";
import { db } from "@/server/db";
import { hashSecretToken } from "@/server/security/tokens";

const schema = z.object({ elapsedSeconds: z.number().int().min(0).max(900) });
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid completion request." },
      { status: 400 },
    );
  const [interview] =
    await db()`UPDATE candidate_interviews SET status='processing',elapsed_seconds=${input.data.elapsedSeconds},completed_at=now(),updated_at=now() WHERE invite_token_hash=${hashSecretToken(token)} AND status='in_progress' RETURNING id,job_id,resume_text`;
  if (!interview) {
    const [done] =
      await db()`SELECT id FROM candidate_interviews WHERE invite_token_hash=${hashSecretToken(token)} AND status IN ('processing','completed','report_failed')`;
    return done
      ? NextResponse.json({ ok: true })
      : NextResponse.json(
          { error: "Interview is not active." },
          { status: 409 },
        );
  }
  void createReport(interview.id).catch(() => undefined);
  return NextResponse.json({ ok: true }, { status: 202 });
}

export async function createReport(id: string) {
  const [interview] =
    await db()`SELECT c.id,c.resume_text,j.rubric FROM candidate_interviews c JOIN jobs j ON j.id=c.job_id WHERE c.id=${id}`;
  if (!interview) return;
  const rows =
    await db()`SELECT role,text FROM interview_turns WHERE candidate_interview_id=${id} ORDER BY sequence_number`;
  const turns = Array.from(rows, (row) => ({
    role: String(row.role),
    text: String(row.text),
  }));
  try {
    const report = await generateReport({
      rubric: interview.rubric,
      turns,
      resumeText: interview.resume_text,
    });
    await db()`UPDATE candidate_interviews SET report=${db().json(report)},status='completed',report_error=NULL,updated_at=now() WHERE id=${id} AND status='processing'`;
  } catch (error) {
    console.error("report_generation_failed", {
      interviewId: id,
      message: error instanceof Error ? error.message : "unknown",
    });
    await db()`UPDATE candidate_interviews SET status='report_failed',report_error='Report generation failed',updated_at=now() WHERE id=${id} AND status='processing'`;
  }
}
