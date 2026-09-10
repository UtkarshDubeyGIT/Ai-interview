import { NextResponse } from "next/server";
import { buildInterviewInstructions } from "@/server/ai/interviewer";
import { db } from "@/server/db";
import { findInterviewByToken } from "@/server/interviews";

export async function POST(
  request: Request,
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
  const rows =
    await db()`SELECT role,text FROM interview_turns WHERE candidate_interview_id=${interview.id} ORDER BY sequence_number`;
  const turns = Array.from(rows, (row) => ({
    role: String(row.role) as "candidate" | "interviewer",
    text: String(row.text),
  }));
  const instructions = buildInterviewInstructions({
    candidateName: interview.candidate_name,
    jobTitle: interview.title,
    jobDescription: interview.description,
    resumeText: interview.resume_text ?? "",
    competencies: interview.rubric.competencies.map(
      (c: { name: string }) => c.name,
    ),
    completedTurns: turns,
    secondsRemaining: 900 - interview.elapsed_seconds,
  });
  const sdp = await request.text();
  const form = new FormData();
  form.set("sdp", new Blob([sdp], { type: "application/sdp" }), "offer.sdp");
  form.set(
    "session",
    new Blob(
      [
        JSON.stringify({
          type: "realtime",
          model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
          instructions,
          output_modalities: ["audio"],
          audio: {
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe",
                language: "en",
              },
              turn_detection: {
                type: "semantic_vad",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: "marin" },
          },
        }),
      ],
      { type: "application/json" },
    ),
  );
  const started = Date.now();
  const upstream = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!upstream.ok) {
    console.error("realtime_connect_failed", {
      interviewId: interview.id,
      status: upstream.status,
      latencyMs: Date.now() - started,
    });
    return NextResponse.json(
      { error: "The voice service is temporarily unavailable." },
      { status: 502 },
    );
  }
  await db()`UPDATE candidate_interviews SET status='in_progress',started_at=COALESCE(started_at,now()),updated_at=now() WHERE id=${interview.id} AND status='not_started'`;
  console.info("realtime_connected", {
    interviewId: interview.id,
    latencyMs: Date.now() - started,
  });
  return new Response(await upstream.text(), {
    status: 201,
    headers: { "content-type": "application/sdp" },
  });
}
