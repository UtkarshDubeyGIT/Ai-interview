import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ownedCandidate } from "@/server/ownership";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await ownedCandidate(id)))
    return NextResponse.json(
      { error: "Candidate not found." },
      { status: 404 },
    );
  await db()`DELETE FROM candidate_interviews WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
