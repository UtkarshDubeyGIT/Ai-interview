import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ownedCandidate } from "@/server/ownership";
import { createSecretToken, hashSecretToken } from "@/server/security/tokens";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const candidate = await ownedCandidate(id);
  if (!candidate || candidate.status !== "completed")
    return NextResponse.json(
      { error: "Completed report not found." },
      { status: 404 },
    );
  const token = createSecretToken();
  await db().begin(async (tx) => {
    await tx`UPDATE shared_reports SET revoked_at=now() WHERE candidate_interview_id=${id} AND revoked_at IS NULL`;
    await tx`INSERT INTO shared_reports(candidate_interview_id,token_hash) VALUES(${id},${hashSecretToken(token)})`;
  });
  return NextResponse.json({
    url: `${process.env.APP_BASE_URL}/report/${token}`,
  });
}
