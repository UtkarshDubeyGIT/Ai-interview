import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ownedCandidate } from "@/server/ownership";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await ownedCandidate(id)))
    return NextResponse.json(
      { error: "Candidate not found." },
      { status: 404 },
    );
  await db()`UPDATE shared_reports SET revoked_at=now() WHERE candidate_interview_id=${id} AND revoked_at IS NULL`;
  return NextResponse.json({ ok: true });
}
