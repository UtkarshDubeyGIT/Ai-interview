"use client";

import type {
  ConversationAgent,
  InteractionConfig,
  ServerTranscriptMsg,
} from "sarvam-conv-ai-sdk/browser";
import { useEffect, useRef, useState } from "react";
import { AudioWaveform, type AudioMeter } from "./audio-waveform";
import { InterviewTranscript, type DisplayTurn } from "./interview-transcript";

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
  initialTurns = [],
}: {
  token: string;
  candidateName: string;
  roleTitle: string;
  initialStatus: string;
  initialElapsed: number;
  initialTurns?: DisplayTurn[];
}) {
  const [consented, setConsented] = useState(initialStatus !== "not_started");
  const [captions, setCaptions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [state, setState] = useState<UiState>("Ready");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(initialElapsed);
  const [turns, setTurns] = useState<DisplayTurn[]>(initialTurns);
  const levels = useRef<AudioMeter>({
    input: 0,
    output: 0,
    inputAt: 0,
    outputAt: 0,
  });
  const starting = useRef(false);
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
    if (agent.current || starting.current || finishing.current) return;
    starting.current = true;
    setMuted(false);
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
        audioLevelCallback: ({ direction, rms }) => {
          levels.current[direction] = rms;
          levels.current[direction === "input" ? "inputAt" : "outputAt"] =
            performance.now();
        },
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
          if (role === "candidate") setState("Thinking");
          const eventId = [
            "sarvam",
            conversation.getInteractionId() ?? "connecting",
            message.timestamp,
            message.role,
            ++transcriptSequence.current,
          ].join(":");
          setTurns((previous) => [...previous, { id: eventId, role, text }]);
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
    } finally {
      starting.current = false;
    }
  }

  function toggleMute() {
    if (!agent.current) return;
    if (muted) agent.current.unmute();
    else agent.current.mute();
    setMuted(!muted);
  }

  const connected = [
    "Listening",
    "Transcribing",
    "Thinking",
    "Speaking",
  ].includes(state);
  const busy = state === "Connecting";
  const remaining = Math.max(0, 900 - seconds);
  const guidance: Record<UiState, string> = {
    Ready:
      initialElapsed > 0
        ? "Pick up where you left off."
        : "A little preparation. A better conversation.",
    Connecting: "Getting your interview ready…",
    Listening: muted
      ? "Your microphone is muted."
      : "Take your time. Mira is listening.",
    Transcribing: "Finishing your response…",
    Thinking: "Mira is considering your answer.",
    Speaking: "You can interrupt to ask a question.",
    Retrying: "Let’s get you connected again.",
    Complete: "Thank you for your time.",
  };

  return (
    <main className="interview-page">
      <div className="interview-topline">
        <span className="brand">
          <span className="brand-mark">V</span> Violet Interview
        </span>
        <span className="private-label">Private interview</span>
      </div>
      <div
        className={`interview-layout ${captions && consented && state !== "Complete" ? "with-transcript" : ""}`}
      >
        <section className="interview-stage" aria-label="Voice interview">
          <header className="room-header">
            <div>
              <p className="eyebrow">Your interview</p>
              <p className="room-role">{roleTitle}</p>
            </div>
            <div
              className="room-timer"
              role="timer"
              aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
            >
              <span>
                {String(Math.floor(remaining / 60)).padStart(2, "0")}
                <span className="timer-colon">:</span>
                {String(remaining % 60).padStart(2, "0")}
              </span>
              <small>remaining</small>
            </div>
          </header>
          <div className="interviewer-center">
            <div className="mira-medallion" data-state={state}>
              <div className="portrait">{state === "Complete" ? "✓" : "M"}</div>
            </div>
            <span className="interviewer-label">Mira · AI interviewer</span>
            <h1 className="heading">
              {state === "Complete"
                ? "You’re all done."
                : !consented
                  ? `Hi ${candidateName.split(" ")[0]}, meet Mira.`
                  : state === "Ready"
                    ? "Ready when you are."
                    : state === "Speaking"
                      ? "Mira is speaking"
                      : state === "Thinking"
                        ? "A moment to think"
                        : state === "Listening"
                          ? "The floor is yours"
                          : state === "Transcribing"
                            ? "Got it, one moment"
                            : state === "Retrying"
                              ? "Let’s reconnect"
                              : "Connecting with Mira"}
            </h1>
            <p className="room-guidance" role="status">
              {guidance[state]}
            </p>
            <AudioWaveform
              levels={levels}
              active={connected}
              muted={muted}
              speaking={state === "Speaking"}
            />
            {connected && (
              <span className="connection-badge">
                <span />
                Connected · {muted ? "Microphone muted" : "Microphone on"}
              </span>
            )}
          </div>
          {state === "Complete" ? (
            <div className="room-completion">
              <p>Your responses have been submitted to the company.</p>
              <p>You can safely close this window.</p>
            </div>
          ) : (
            <>
              {!consented && (
                <div className="interview-preflight">
                  <div className="interview-facts">
                    <span>15 minutes</span>
                    <span>English or Hinglish</span>
                    <span>Voice conversation</span>
                  </div>
                  <p>
                    Mira will ask about your experience and how you approach
                    your work. Find a quiet spot and speak naturally.
                  </p>
                  <p className="consent-copy">
                    By starting, you consent to live microphone processing and
                    transcript storage. Your transcript and evaluation are
                    shared with the company.
                  </p>
                </div>
              )}
              {error && (
                <p className="error room-error" role="alert">
                  {error}
                </p>
              )}
              <div className="room-controls">
                {!consented ? (
                  <button
                    className="button button-primary room-start"
                    onClick={begin}
                    disabled={busy}
                  >
                    I consent — start interview{" "}
                    <span aria-hidden="true">↗</span>
                  </button>
                ) : (
                  <>
                    {(state === "Retrying" || state === "Ready") && (
                      <button className="button button-primary" onClick={begin}>
                        {state === "Retrying"
                          ? "Retry connection"
                          : initialElapsed
                            ? "Resume interview"
                            : "Start interview"}
                      </button>
                    )}
                    <button
                      className="button room-control"
                      onClick={toggleMute}
                      disabled={!connected}
                      aria-pressed={muted}
                    >
                      <span aria-hidden="true">{muted ? "◌" : "●"}</span>
                      {muted ? "Unmute" : "Microphone"}
                    </button>
                    <button
                      className="button room-control"
                      onClick={() => setCaptions((value) => !value)}
                      aria-pressed={captions}
                      aria-controls="live-transcript"
                    >
                      <span className="caption-icon" aria-hidden="true">
                        CC
                      </span>
                      Captions
                    </button>
                    <button
                      className="button button-danger"
                      disabled={busy || finishing.current}
                      onClick={() => void finishInterview()}
                    >
                      End interview
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          <footer className="room-footer">
            A focused conversation about your experience.
          </footer>
        </section>
        {captions && consented && state !== "Complete" && (
          <div id="live-transcript">
            <InterviewTranscript
              turns={turns}
              candidateName={candidateName}
              live
            />
          </div>
        )}
      </div>
    </main>
  );
}
