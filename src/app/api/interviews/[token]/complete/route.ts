import { NextResponse } from "next/server";
import { z } from "zod";
import {
  completionReasons,
  normalizeCompletionReason,
} from "@/domain/interview";
import { db } from "@/server/db";
import { createReport } from "@/server/reports";
import { hashSecretToken } from "@/server/security/tokens";

const schema = z.object({
  elapsedSeconds: z.number().int().min(0).max(900),
  completionReason: z.enum(completionReasons).default("agent_completed"),
});
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
  const completionReason = normalizeCompletionReason(
    input.data.completionReason,
    input.data.elapsedSeconds,
  );
  const [interview] = await db()`
    UPDATE candidate_interviews
    SET status='processing',elapsed_seconds=${input.data.elapsedSeconds},completion_reason=${completionReason},completed_at=now(),updated_at=now()
    WHERE invite_token_hash=${hashSecretToken(token)} AND status='in_progress'
    RETURNING id,completion_reason
  `;
  if (!interview) {
    const [done] =
      await db()`SELECT id,completion_reason FROM candidate_interviews WHERE invite_token_hash=${hashSecretToken(token)} AND status IN ('processing','completed','report_failed')`;
    return done
      ? NextResponse.json({
          ok: true,
          completionReason: done.completion_reason ?? completionReason,
        })
      : NextResponse.json(
          { error: "Interview is not active." },
          { status: 409 },
        );
  }
  void createReport(interview.id).catch(() => undefined);
  return NextResponse.json(
    { ok: true, completionReason: interview.completion_reason },
    { status: 202 },
  );
}
