import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ownedCandidate } from "@/server/ownership";
import { createReport } from "@/server/reports";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const candidate = await ownedCandidate(id);
  if (!candidate || candidate.status !== "report_failed")
    return NextResponse.json(
      { error: "Report is not ready to retry." },
      { status: 409 },
    );
  await db()`UPDATE candidate_interviews SET status='processing',report_error=NULL,updated_at=now() WHERE id=${id} AND status='report_failed'`;
  void createReport(id).catch(() => undefined);
  return NextResponse.json({ ok: true }, { status: 202 });
}
