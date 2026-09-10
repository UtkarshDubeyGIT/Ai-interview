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
  if (!candidate || !["completed", "report_failed"].includes(candidate.status))
    return NextResponse.json(
      { error: "Report is not ready to reassess." },
      { status: 409 },
    );
  const [claimed] =
    await db()`UPDATE candidate_interviews SET status='processing',report_error=NULL,updated_at=now() WHERE id=${id} AND status IN ('completed','report_failed') RETURNING id`;
  if (!claimed)
    return NextResponse.json(
      { error: "Report is already being generated." },
      { status: 409 },
    );
  void createReport(id).catch(() => undefined);
  return NextResponse.json({ ok: true }, { status: 202 });
}
