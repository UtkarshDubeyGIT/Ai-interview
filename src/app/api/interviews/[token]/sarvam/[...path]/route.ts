import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { findInterviewByToken } from "@/server/interviews";

const signedUrlResponse = z.object({
  url: z.string().url(),
  reference_id: z.string().min(1),
});

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string; path: string[] }> },
) {
  const { token, path } = await params;
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

  const apiKey = process.env.SARVAM_API_KEY;
  const orgId = process.env.SARVAM_ORG_ID;
  const workspaceId = process.env.SARVAM_WORKSPACE_ID;
  const agentId = process.env.SARVAM_AGENT_ID;
  const expectedPath = [
    "orgs",
    orgId,
    "workspaces",
    workspaceId,
    "apps",
    agentId,
    "url",
  ];
  if (
    !apiKey ||
    !orgId ||
    !workspaceId ||
    !agentId ||
    path.length !== expectedPath.length ||
    path.some((segment, index) => segment !== expectedPath[index])
  )
    return NextResponse.json(
      { error: "The voice service is not configured." },
      { status: 503 },
    );

  const upstreamUrl = new URL(
    `orgs/${encodeURIComponent(orgId)}/workspaces/${encodeURIComponent(workspaceId)}/apps/${encodeURIComponent(agentId)}/url`,
    "https://apps.sarvam.ai/api/app-runtime/",
  );
  upstreamUrl.searchParams.set("interaction_type", "call");
  upstreamUrl.searchParams.set("version", "1");
  const started = Date.now();
  const upstream = await fetch(upstreamUrl, {
    headers: { "X-API-Key": apiKey },
    cache: "no-store",
  });
  if (!upstream.ok) {
    console.error("sarvam_connect_failed", {
      interviewId: interview.id,
      status: upstream.status,
      latencyMs: Date.now() - started,
    });
    return NextResponse.json(
      { error: "The voice service is temporarily unavailable." },
      { status: 502 },
    );
  }

  const parsed = signedUrlResponse.safeParse(await upstream.json());
  if (!parsed.success) {
    console.error("sarvam_response_invalid", { interviewId: interview.id });
    return NextResponse.json(
      { error: "The voice service returned an invalid response." },
      { status: 502 },
    );
  }

  await db()`UPDATE candidate_interviews SET provider='sarvam',provider_session_id=${parsed.data.reference_id},status='in_progress',started_at=COALESCE(started_at,now()),updated_at=now() WHERE id=${interview.id} AND status IN ('not_started','in_progress')`;
  console.info("sarvam_connected", {
    interviewId: interview.id,
    providerSessionId: parsed.data.reference_id,
    latencyMs: Date.now() - started,
  });
  return NextResponse.json(parsed.data, {
    headers: { "cache-control": "no-store" },
  });
}
