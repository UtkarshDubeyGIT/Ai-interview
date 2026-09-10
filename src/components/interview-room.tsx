"use client";
import { useEffect, useRef, useState } from "react";

type UiState =
  | "Ready"
  | "Connecting"
  | "Listening"
  | "Transcribing"
  | "Thinking"
  | "Speaking"
  | "Retrying"
  | "Complete";
export function InterviewRoom({
  token,
  candidateName,
  roleTitle,
  initialStatus,
  initialElapsed,
}: {
  token: string;
  candidateName: string;
  roleTitle: string;
  initialStatus: string;
  initialElapsed: number;
}) {
  const [consented, setConsented] = useState(initialStatus !== "not_started");
  const [captions, setCaptions] = useState(false);
  const [state, setState] = useState<UiState>("Ready");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(initialElapsed);
  const [caption, setCaption] = useState("");
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const finishing = useRef(false);
  useEffect(() => {
    if (
      state === "Listening" ||
      state === "Thinking" ||
      state === "Speaking" ||
      state === "Transcribing"
    ) {
      const timer = setInterval(
        () => setSeconds((value) => Math.min(900, value + 1)),
        1000,
      );
      return () => clearInterval(timer);
    }
  }, [state]);
  useEffect(() => {
    if (seconds === 810 && dataChannel.current?.readyState === "open") {
      dataChannel.current.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Time check: wrap up now. Ask at most one final concise question, then thank the candidate.",
              },
            ],
          },
        }),
      );
    }
    if (seconds >= 900 && !finishing.current && state !== "Complete") {
      finishing.current = true;
      pc.current?.close();
      stream.current?.getTracks().forEach((track) => track.stop());
      void fetch(`/api/interviews/${token}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ elapsedSeconds: 900 }),
      }).then((response) => {
        if (response.ok) setState("Complete");
        else {
          finishing.current = false;
          setError(
            "Your completed answers are safe. Retry ending the interview.",
          );
        }
      });
    }
  }, [seconds, state, token]);
  async function persist(
    role: "candidate" | "interviewer",
    text: string,
    eventId: string,
  ) {
    if (!text.trim()) return;
    await fetch(`/api/interviews/${token}/turns`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": eventId,
      },
      body: JSON.stringify({
        role,
        text,
        providerEventId: eventId,
        elapsedSeconds: seconds,
      }),
    });
  }
  async function begin() {
    setError("");
    setState("Connecting");
    try {
      await fetch(`/api/interviews/${token}/consent`, { method: "POST" });
      setConsented(true);
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const peer = new RTCPeerConnection();
      pc.current = peer;
      for (const track of stream.current.getTracks())
        peer.addTrack(track, stream.current);
      const audio = document.createElement("audio");
      audio.autoplay = true;
      peer.ontrack = (e) => {
        audio.srcObject = e.streams[0];
      };
      const channel = peer.createDataChannel("oai-events");
      dataChannel.current = channel;
      channel.onopen = () => {
        setState("Listening");
        channel.send(JSON.stringify({ type: "response.create" }));
      };
      channel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "input_audio_buffer.speech_started")
          setState("Listening");
        if (data.type === "input_audio_buffer.speech_stopped")
          setState("Transcribing");
        if (
          data.type === "conversation.item.input_audio_transcription.completed"
        ) {
          setCaption(data.transcript);
          void persist(
            "candidate",
            data.transcript,
            data.event_id ?? data.item_id,
          );
        }
        if (data.type === "response.created") setState("Thinking");
        if (data.type === "response.output_audio.delta") setState("Speaking");
        if (data.type === "response.output_audio_transcript.done") {
          setCaption(data.transcript);
          void persist(
            "interviewer",
            data.transcript,
            data.event_id ?? data.item_id,
          );
          setState("Listening");
        }
        if (data.type === "error") {
          setError(
            data.error?.message ?? "The voice service could not continue.",
          );
          setState("Retrying");
        }
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await fetch(`/api/interviews/${token}/realtime`, {
        method: "POST",
        headers: { "content-type": "application/sdp" },
        body: offer.sdp,
      });
      if (!response.ok)
        throw new Error((await response.json()).error ?? "Could not connect");
      await peer.setRemoteDescription({
        type: "answer",
        sdp: await response.text(),
      });
    } catch (reason) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(
        reason instanceof DOMException && reason.name === "NotAllowedError"
          ? "Microphone access was denied. Allow it in your browser settings, then retry."
          : reason instanceof Error
            ? reason.message
            : "Could not start the interview.",
      );
      setState("Retrying");
    }
  }
  async function complete() {
    if (state === "Complete") return;
    if (!confirm("End the interview and submit your responses?")) return;
    if (finishing.current) return;
    finishing.current = true;
    pc.current?.close();
    stream.current?.getTracks().forEach((t) => t.stop());
    const response = await fetch(`/api/interviews/${token}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ elapsedSeconds: seconds }),
    });
    if (response.ok) setState("Complete");
    else {
      finishing.current = false;
      setError("Your completed answers are safe. Retry ending the interview.");
    }
  }
  if (state === "Complete")
    return (
      <main className="interview-page">
        <div className="interview-shell">
          <section className="interview-card" style={{ textAlign: "center" }}>
            <div className="portrait" style={{ margin: "0 auto 1.5rem" }}>
              ✓
            </div>
            <h1 className="heading">Interview complete</h1>
            <p style={{ color: "var(--theme-neutral-300)" }}>
              Thank you. Your responses were submitted successfully.
            </p>
          </section>
        </div>
      </main>
    );
  return (
    <main className="interview-page">
      <div className="interview-shell">
        <section className="interview-card">
          {!consented ? (
            <>
              <p className="eyebrow">Private interview · {roleTitle}</p>
              <h1 className="heading">Hi {candidateName}, meet Mira.</h1>
              <p
                style={{ color: "var(--theme-neutral-300)", maxWidth: "42rem" }}
              >
                This is a 15-minute AI voice interview. Your microphone audio is
                processed live but not recorded. A transcript and evidence-based
                evaluation will be shared with the company.
              </p>
              <div className="notice" style={{ margin: "1.5rem 0" }}>
                By continuing, you consent to microphone processing and
                transcript storage for this interview.
              </div>
              <button className="button button-primary" onClick={begin}>
                I consent — test microphone
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <div className="portrait">M</div>
                  <div>
                    <strong>Mira</strong>
                    <div style={{ color: "var(--theme-neutral-300)" }}>
                      {state}
                    </div>
                  </div>
                </div>
                <strong>
                  {String(Math.floor((900 - seconds) / 60)).padStart(2, "0")}:
                  {String((900 - seconds) % 60).padStart(2, "0")}
                </strong>
              </div>
              <div className="wave" aria-hidden="true">
                {Array.from({ length: 15 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
              {captions && (
                <p
                  aria-live="polite"
                  style={{ textAlign: "center", minHeight: "3rem" }}
                >
                  {caption || "Captions will appear here."}
                </p>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: ".75rem",
                  flexWrap: "wrap",
                }}
              >
                {state === "Retrying" && (
                  <button className="button button-primary" onClick={begin}>
                    Retry connection
                  </button>
                )}
                <button
                  className="button button-secondary"
                  onClick={() => setCaptions((v) => !v)}
                >
                  {captions ? "Hide captions" : "Show captions"}
                </button>
                <button className="button button-danger" onClick={complete}>
                  End interview
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
