import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { hashSecretToken } from "@/server/security/tokens";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const [row] =
    await db()`UPDATE candidate_interviews SET consented_at=COALESCE(consented_at,now()),updated_at=now() WHERE invite_token_hash=${hashSecretToken(token)} AND status IN ('not_started','in_progress') RETURNING id`;
  if (!row)
    return NextResponse.json(
      { error: "This interview link is unavailable." },
      { status: 404 },
    );
  return NextResponse.json({ ok: true });
}
