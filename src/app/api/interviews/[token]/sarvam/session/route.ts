import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { findInterviewByToken } from "@/server/interviews";
import { buildSarvamAgentVariables } from "@/server/voice/sarvam";
import { sarvamAgentVersion } from "@/server/voice/sarvam";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const interview = await findInterviewByToken(token);
  if (
    !interview ||
    !interview.consented_at ||
    !["not_started", "in_progress"].includes(interview.status)
  )
    return NextResponse.json(
      { error: "This interview cannot be started." },
      { status: 404 },
    );

  const orgId = process.env.SARVAM_ORG_ID;
  const workspaceId = process.env.SARVAM_WORKSPACE_ID;
  const agentId = process.env.SARVAM_AGENT_ID;
  const version = sarvamAgentVersion(process.env.SARVAM_AGENT_VERSION);
  if (!orgId || !workspaceId || !agentId || !process.env.SARVAM_API_KEY) {
    console.error("sarvam_configuration_missing", {
      interviewId: interview.id,
    });
    return NextResponse.json(
      { error: "The voice service is not configured." },
      { status: 503 },
    );
  }

  const rows =
    await db()`SELECT role,text FROM interview_turns WHERE candidate_interview_id=${interview.id} ORDER BY sequence_number`;
  const completedTurns = Array.from(rows, (row) => ({
    role: String(row.role) as "candidate" | "interviewer",
    text: String(row.text),
  }));

  const agentVariables = buildSarvamAgentVariables({
    candidateName: interview.candidate_name,
    jobTitle: interview.title,
    jobDescription: interview.description,
    rubric: interview.rubric,
    resumeText: interview.resume_text ?? "",
    completedTurns,
    secondsRemaining: 900 - interview.elapsed_seconds,
  });

  return NextResponse.json(
    {
      baseUrl: `/api/interviews/${token}/sarvam/`,
      config: {
        user_identifier_type: "custom",
        user_identifier: `interview-${interview.id}`,
        org_id: orgId,
        workspace_id: workspaceId,
        app_id: agentId,
        version,
        interaction_type: "call",
        input_sample_rate: 16000,
        output_sample_rate: 22050,
        agent_variables: agentVariables,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
