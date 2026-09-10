import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { candidateUploadSchema } from "@/domain/candidate";
import { db } from "@/server/db";
import { extractResumeText } from "@/server/resume";
import { createSecretToken, hashSecretToken } from "@/server/security/tokens";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [job] =
    await db()`SELECT id FROM jobs WHERE id=${id} AND owner_id=${session.user.id}`;
  if (!job)
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  const form = await request.formData();
  const file = form.get("resume");
  if (!(file instanceof File))
    return NextResponse.json(
      { error: "Choose a PDF résumé." },
      { status: 400 },
    );
  const input = candidateUploadSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    mimeType: file.type,
    size: file.size,
  });
  if (!input.success)
    return NextResponse.json(
      { error: "Use a valid name, email, and PDF no larger than 5 MB." },
      { status: 400 },
    );
  let resumeText = "";
  let parseFailed = false;
  try {
    resumeText = await extractResumeText(
      new Uint8Array(await file.arrayBuffer()),
    );
    parseFailed = resumeText.length < 80;
  } catch {
    parseFailed = true;
  }
  const token = createSecretToken();
  const [candidate] =
    await db()`INSERT INTO candidate_interviews(job_id,candidate_name,candidate_email,resume_text,resume_parse_failed,invite_token_hash) VALUES(${id},${input.data.name},${input.data.email.toLowerCase()},${resumeText || null},${parseFailed},${hashSecretToken(token)}) RETURNING id`;
  return NextResponse.json(
    {
      id: candidate.id,
      inviteUrl: `${process.env.APP_BASE_URL}/interview/${token}`,
    },
    { status: 201 },
  );
}
