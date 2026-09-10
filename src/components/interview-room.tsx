"use client";

import type {
  ConversationAgent,
  InteractionConfig,
  ServerTranscriptMsg,
} from "sarvam-conv-ai-sdk/browser";
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

type SarvamSession = {
  baseUrl: string;
  config: Omit<InteractionConfig, "interaction_type"> & {
    interaction_type: "call";
  };
};

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
  const [muted, setMuted] = useState(false);
  const [state, setState] = useState<UiState>("Ready");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(initialElapsed);
  const [caption, setCaption] = useState("");
  const agent = useRef<ConversationAgent | null>(null);
  const secondsRef = useRef(initialElapsed);
  const finishing = useRef(false);
  const completeOnProviderEnd = useRef(false);
  const transcriptSequence = useRef(0);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

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
    if (seconds >= 900 && !finishing.current && state !== "Complete") {
      void finishInterview(false, 900);
    }
  });

  useEffect(
    () => () => {
      completeOnProviderEnd.current = false;
      void agent.current?.stop();
      agent.current = null;
    },
    [],
  );

  async function persist(
    role: "candidate" | "interviewer",
    text: string,
    eventId: string,
  ) {
    if (!text.trim()) return;
    const response = await fetch(`/api/interviews/${token}/turns`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": eventId,
      },
      body: JSON.stringify({
        role,
        text,
        providerEventId: eventId,
        elapsedSeconds: secondsRef.current,
      }),
    });
    if (!response.ok)
      setError(
        "A transcript turn could not be saved. It will be retried if repeated.",
      );
  }

  async function finishInterview(
    confirmFirst = true,
    elapsed = secondsRef.current,
  ) {
    if (state === "Complete" || finishing.current) return;
    if (
      confirmFirst &&
      !confirm("End the interview and submit your responses?")
    )
      return;

    finishing.current = true;
    completeOnProviderEnd.current = false;
    const activeAgent = agent.current;
    agent.current = null;
    await activeAgent?.stop().catch(() => undefined);
    const response = await fetch(`/api/interviews/${token}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ elapsedSeconds: Math.min(900, elapsed) }),
    });
    if (response.ok) {
      setState("Complete");
      return;
    }

    finishing.current = false;
    setState("Retrying");
    setError("Your completed answers are safe. Retry ending the interview.");
  }

  async function begin() {
    if (agent.current) return;
    completeOnProviderEnd.current = false;
    setError("");
    setState("Connecting");
    try {
      const consentResponse = await fetch(`/api/interviews/${token}/consent`, {
        method: "POST",
      });
      if (!consentResponse.ok)
        throw new Error("This interview link is unavailable.");
      setConsented(true);

      const sessionResponse = await fetch(
        `/api/interviews/${token}/sarvam/session`,
        { method: "POST" },
      );
      const session = (await sessionResponse.json()) as SarvamSession & {
        error?: string;
      };
      if (!sessionResponse.ok)
        throw new Error(
          session.error ?? "Could not prepare the voice interview.",
        );

      const {
        AgentState,
        BrowserAudioInterface,
        ConversationAgent,
        InteractionType,
      } = await import("sarvam-conv-ai-sdk/browser");
      const conversation = new ConversationAgent({
        apiKey: "server-proxied",
        platform: "browser",
        baseUrl: new URL(session.baseUrl, window.location.origin).toString(),
        config: {
          ...session.config,
          interaction_type: InteractionType.CALL,
        },
        audioInterface: new BrowserAudioInterface(16000),
        stateCallback: (nextState) => {
          if (nextState === AgentState.CONNECTING) setState("Connecting");
          if (nextState === AgentState.LISTENING) setState("Listening");
          if (nextState === AgentState.SPEAKING) setState("Speaking");
          if (nextState === AgentState.ERROR) setState("Retrying");
        },
        eventCallback: async (event) => {
          if (event.type === "server.event.user_speech_start")
            setState("Listening");
          if (event.type === "server.event.user_speech_end")
            setState("Transcribing");
          if (event.type === "server.action.interaction_end")
            await finishInterview(false);
        },
        endCallback: async () => {
          if (completeOnProviderEnd.current) await finishInterview(false);
        },
        transcriptCallback: async (message: ServerTranscriptMsg) => {
          const text = message.content.trim();
          if (!text) return;
          const role = message.role === "user" ? "candidate" : "interviewer";
          setCaption(text);
          if (role === "candidate") setState("Thinking");
          const eventId = [
            "sarvam",
            conversation.getInteractionId() ?? "connecting",
            message.timestamp,
            message.role,
            ++transcriptSequence.current,
          ].join(":");
          await persist(role, text, eventId);
        },
      });

      agent.current = conversation;
      await conversation.start();
      if (!(await conversation.waitForConnect(12)))
        throw new Error(
          "The voice service took too long to connect. Please retry.",
        );
      completeOnProviderEnd.current = true;
      setState("Listening");
    } catch (reason) {
      completeOnProviderEnd.current = false;
      await agent.current?.stop().catch(() => undefined);
      agent.current = null;
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

  function toggleMute() {
    if (!agent.current) return;
    if (muted) agent.current.unmute();
    else agent.current.mute();
    setMuted(!muted);
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
                {Array.from({ length: 15 }, (_, index) => (
                  <span key={index} />
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
                {(state === "Retrying" || state === "Ready") && (
                  <button className="button button-primary" onClick={begin}>
                    {state === "Retrying"
                      ? "Retry connection"
                      : "Start interview"}
                  </button>
                )}
                <button
                  className="button button-secondary"
                  onClick={() => setCaptions((value) => !value)}
                >
                  {captions ? "Hide captions" : "Show captions"}
                </button>
                <button
                  className="button button-secondary"
                  onClick={toggleMute}
                  disabled={!agent.current}
                >
                  {muted ? "Unmute microphone" : "Mute microphone"}
                </button>
                <button
                  className="button button-danger"
                  onClick={() => void finishInterview()}
                >
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
