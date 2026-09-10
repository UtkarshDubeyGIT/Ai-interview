import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ownedCandidate } from "@/server/ownership";
import { createSecretToken, hashSecretToken } from "@/server/security/tokens";

function reportUrl(publicId: string) {
  return `${process.env.APP_BASE_URL}/report/${publicId}`;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const candidate = await ownedCandidate(id);
  if (!candidate) {
    return NextResponse.json(
      { error: "Candidate not found." },
      { status: 404 },
    );
  }
  const [active] = await db()`
    SELECT public_id
    FROM shared_reports
    WHERE candidate_interview_id=${id} AND revoked_at IS NULL
  `;
  return NextResponse.json({
    active: Boolean(active),
    url: active?.public_id ? reportUrl(String(active.public_id)) : null,
  });
}

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
  const publicId = await db().begin(async (tx) => {
    await tx`SELECT id FROM candidate_interviews WHERE id=${id} FOR UPDATE`;
    const [active] = await tx`
      SELECT id,public_id
      FROM shared_reports
      WHERE candidate_interview_id=${id} AND revoked_at IS NULL
      FOR UPDATE
    `;
    if (active?.public_id) return String(active.public_id);

    const token = createSecretToken();
    if (active) {
      await tx`UPDATE shared_reports SET public_id=${token} WHERE id=${active.id}`;
    } else {
      await tx`
        INSERT INTO shared_reports(candidate_interview_id,token_hash,public_id)
        VALUES(${id},${hashSecretToken(token)},${token})
      `;
    }
    return token;
  });
  return NextResponse.json({
    active: true,
    url: reportUrl(publicId),
  });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await ownedCandidate(id))) {
    return NextResponse.json(
      { error: "Candidate not found." },
      { status: 404 },
    );
  }
  await db()`
    UPDATE shared_reports
    SET revoked_at=now()
    WHERE candidate_interview_id=${id} AND revoked_at IS NULL
  `;
  return NextResponse.json({ ok: true, active: false });
}
