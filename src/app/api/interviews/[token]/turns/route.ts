import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { hashSecretToken } from "@/server/security/tokens";

const schema = z.object({
  role: z.enum(["candidate", "interviewer"]),
  text: z.string().trim().min(1).max(12000),
  providerEventId: z.string().min(1).max(200),
  elapsedSeconds: z.number().int().min(0).max(900),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid finalized turn." },
      { status: 400 },
    );
  const header = request.headers.get("idempotency-key");
  if (header !== input.data.providerEventId)
    return NextResponse.json(
      { error: "Idempotency key mismatch." },
      { status: 400 },
    );
  const sql = db();
  const result = await sql.begin(async (tx) => {
    const [interview] =
      await tx`SELECT id,status FROM candidate_interviews WHERE invite_token_hash=${hashSecretToken(token)} FOR UPDATE`;
    if (!interview || interview.status !== "in_progress") return null;
    const [existing] =
      await tx`SELECT id,sequence_number FROM interview_turns WHERE candidate_interview_id=${interview.id} AND provider_event_id=${input.data.providerEventId}`;
    if (existing) return existing;
    const [{ next }] =
      await tx`SELECT COALESCE(MAX(sequence_number),0)+1 next FROM interview_turns WHERE candidate_interview_id=${interview.id}`;
    const [turn] =
      await tx`INSERT INTO interview_turns(candidate_interview_id,role,text,sequence_number,provider_event_id) VALUES(${interview.id},${input.data.role},${input.data.text},${next},${input.data.providerEventId}) RETURNING id,sequence_number`;
    await tx`UPDATE candidate_interviews SET elapsed_seconds=GREATEST(elapsed_seconds,${input.data.elapsedSeconds}),updated_at=now() WHERE id=${interview.id}`;
    return turn;
  });
  if (!result)
    return NextResponse.json(
      { error: "Interview is not active." },
      { status: 409 },
    );
  return NextResponse.json(result, { status: 201 });
}
