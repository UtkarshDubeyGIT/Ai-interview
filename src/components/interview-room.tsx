"use client";

import { BrandLogo } from "@/components/brand-logo";

import {
  ClosedCaptioning,
  Microphone,
  MicrophoneSlash,
  PhoneX,
  Play,
  ArrowClockwise,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import type {
  ConversationAgent,
  InteractionConfig,
  ServerTranscriptMsg,
} from "sarvam-conv-ai-sdk/browser";
import { useEffect, useRef, useState } from "react";
import {
  completionTitle,
  normalizeCompletionReason,
  sessionEndCompletionReason,
  type CompletionReason,
  type SessionEndInitiator,
} from "@/domain/interview";
import {
  activeInterviewState,
  barVisualizerState,
  candidateProcessingState,
  CANDIDATE_PROCESSING_GRACE_MS,
  orbState,
  showPreflightStartButton,
  type AudioLevels,
  type InterviewUiState,
} from "@/domain/interview-ui";
import { BarVisualizer } from "./ui/bar-visualizer";
import { ConfirmationDialog } from "./confirmation-dialog";
import { InterviewTranscript, type DisplayTurn } from "./interview-transcript";

const Orb = dynamic(() => import("./ui/orb").then((module) => module.Orb), {
  ssr: false,
  loading: () => <div className="orb-loading" aria-hidden="true" />,
});

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
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [state, setState] = useState<InterviewUiState>("Ready");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(initialElapsed);
  const [turns, setTurns] = useState<DisplayTurn[]>(initialTurns);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [completionReason, setCompletionReason] =
    useState<CompletionReason | null>(null);
  const levels = useRef<AudioLevels>({
    input: 0,
    output: 0,
    inputAt: 0,
    outputAt: 0,
  });
  const starting = useRef(false);
  const agent = useRef<ConversationAgent | null>(null);
  const secondsRef = useRef(initialElapsed);
  const finishing = useRef(false);
  const handlingSessionEnd = useRef(false);
  const intentionalStop = useRef(false);
  const mounted = useRef(true);
  const stateRef = useRef<InterviewUiState>("Ready");
  const processingTimer = useRef<number | null>(null);
  const transcriptSequence = useRef(0);

  function setInterviewState(nextState: InterviewUiState) {
    stateRef.current = nextState;
    setState(nextState);
  }

  function clearProcessingTimer() {
    if (processingTimer.current === null) return;
    window.clearTimeout(processingTimer.current);
    processingTimer.current = null;
  }

  function deferCandidateProcessing() {
    clearProcessingTimer();
    processingTimer.current = window.setTimeout(() => {
      processingTimer.current = null;
      if (
        finishing.current ||
        ["Speaking", "Retrying", "Complete"].includes(stateRef.current)
      )
        return;
      setInterviewState(
        candidateProcessingState(CANDIDATE_PROCESSING_GRACE_MS),
      );
    }, CANDIDATE_PROCESSING_GRACE_MS);
  }

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);
  useEffect(() => {
    if (!activeInterviewState(state)) return;
    const timer = window.setInterval(
      () => setSeconds((value) => Math.min(900, value + 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [state]);
  useEffect(() => {
    if (seconds >= 900 && !finishing.current && state !== "Complete")
      void finishInterview("time_limit", 900);
  });
  useEffect(
    () => () => {
      mounted.current = false;
      clearProcessingTimer();
      intentionalStop.current = true;
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
    reason: CompletionReason,
    elapsed = secondsRef.current,
  ) {
    if (stateRef.current === "Complete" || finishing.current) return;
    finishing.current = true;
    clearProcessingTimer();
    setConfirmEnd(false);
    const activeAgent = agent.current;
    agent.current = null;
    await activeAgent?.stop().catch(() => undefined);
    const response = await fetch(`/api/interviews/${token}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        elapsedSeconds: Math.min(900, elapsed),
        completionReason: reason,
      }),
    });
    if (response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        completionReason?: CompletionReason;
      };
      setCompletionReason(
        result.completionReason ?? normalizeCompletionReason(reason, elapsed),
      );
      setCaptions(false);
      setInterviewState("Complete");
      return;
    }
    finishing.current = false;
    setInterviewState("Retrying");
    setError("Your completed answers are safe. Retry ending the interview.");
  }

  async function handleSessionEnd(initiator: SessionEndInitiator) {
    if (
      !mounted.current ||
      intentionalStop.current ||
      handlingSessionEnd.current ||
      finishing.current ||
      stateRef.current === "Complete"
    )
      return;
    handlingSessionEnd.current = true;
    const reason = sessionEndCompletionReason(initiator, secondsRef.current);
    if (reason) {
      await finishInterview(reason);
      handlingSessionEnd.current = false;
      return;
    }
    clearProcessingTimer();
    const endedAgent = agent.current;
    agent.current = null;
    intentionalStop.current = true;
    await endedAgent?.stop().catch(() => undefined);
    intentionalStop.current = false;
    if (!mounted.current) return;
    setInterviewState("Retrying");
    setError(
      "The voice connection ended unexpectedly. Your saved answers are safe.",
    );
    handlingSessionEnd.current = false;
  }

  async function begin() {
    if (!consented && !consentAccepted) return;
    if (agent.current || starting.current || finishing.current) return;
    starting.current = true;
    setMuted(false);
    setError("");
    setInterviewState("Connecting");
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
        config: { ...session.config, interaction_type: InteractionType.CALL },
        audioInterface: new BrowserAudioInterface(16000),
        audioLevelCallback: ({ direction, rms }) => {
          levels.current[direction] = rms;
          levels.current[direction === "input" ? "inputAt" : "outputAt"] =
            performance.now();
        },
        stateCallback: (nextState) => {
          if (nextState === AgentState.CONNECTING) {
            clearProcessingTimer();
            setInterviewState("Connecting");
          }
          if (nextState === AgentState.LISTENING) {
            clearProcessingTimer();
            setInterviewState("Listening");
          }
          if (nextState === AgentState.SPEAKING) {
            clearProcessingTimer();
            setInterviewState("Speaking");
          }
          if (nextState === AgentState.ERROR) {
            clearProcessingTimer();
            void handleSessionEnd("error");
          }
        },
        eventCallback: async (event) => {
          if (event.type === "server.event.user_speech_start") {
            clearProcessingTimer();
            setInterviewState("Listening");
          }
          if (event.type === "server.event.user_speech_end")
            deferCandidateProcessing();
          if (event.type === "server.action.interaction_end")
            await finishInterview("agent_completed");
        },
        endCallback: async () => {
          await handleSessionEnd("agent");
        },
        telemetryCallback: (event) => {
          if (event.name !== "session_ended") return;
          const { initiatedBy } = event.properties as {
            initiatedBy: SessionEndInitiator;
          };
          void handleSessionEnd(initiatedBy);
        },
        transcriptCallback: async (message: ServerTranscriptMsg) => {
          const text = message.content.trim();
          if (!text) return;
          const role = message.role === "user" ? "candidate" : "interviewer";
          if (role === "candidate") deferCandidateProcessing();
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
      setInterviewState("Listening");
    } catch (reason) {
      intentionalStop.current = true;
      await agent.current?.stop().catch(() => undefined);
      intentionalStop.current = false;
      agent.current = null;
      setError(
        reason instanceof DOMException && reason.name === "NotAllowedError"
          ? "Microphone access was denied. Allow it in your browser settings, then retry."
          : reason instanceof Error
            ? reason.message
            : "Could not start the interview.",
      );
      setInterviewState("Retrying");
    } finally {
      starting.current = false;
    }
  }

  function toggleMute() {
    if (!agent.current) return;
    if (muted) agent.current.unmute();
    else agent.current.mute();
    setMuted((value) => !value);
  }

  const connected = activeInterviewState(state);
  const busy = state === "Connecting";
  const remaining = Math.max(0, 900 - seconds);
  const visualizerState = barVisualizerState(state);
  const guidance: Record<InterviewUiState, string> = {
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
    Speaking: "Mira is responding. You can still interrupt naturally.",
    Retrying: "Let’s get you connected again.",
    Complete:
      completionReason === "candidate_ended_early"
        ? "The interview was closed before time."
        : "Thank you for your time.",
  };
  const heading =
    state === "Complete"
      ? completionTitle(completionReason ?? "agent_completed")
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
                    : "Connecting with Mira";

  return (
    <main className="interview-page">
      <div className="interview-topline">
        <span className="brand">
          <BrandLogo />
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
            <div className="room-header-actions">
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
              {consented && state !== "Complete" && (
                <button
                  className="end-interview"
                  type="button"
                  onClick={() => setConfirmEnd(true)}
                >
                  <PhoneX size={17} weight="fill" /> End interview
                </button>
              )}
            </div>
          </header>
          <div className="interviewer-center">
            <Orb
              agentState={orbState(state)}
              className="eleven-orb"
              colors={["#6b3eff", "#22a69f"]}
              seed={11}
              volumeMode="manual"
              getInputVolume={() => {
                const current = levels.current;
                return performance.now() - current.inputAt > 250
                  ? 0
                  : Math.min(1, Math.max(0, current.input * 5));
              }}
              getOutputVolume={() => {
                const current = levels.current;
                return performance.now() - current.outputAt > 250
                  ? 0
                  : Math.min(1, Math.max(0, current.output * 5));
              }}
            />
            <span className="interviewer-label">Mira · AI interviewer</span>
            <h1 className="heading">{heading}</h1>
            <p className="room-guidance" role="status">
              {guidance[state]}
            </p>
            {visualizerState && (
              <BarVisualizer
                state={state}
                levels={levels}
                muted={muted}
                barCount={20}
                minHeight={15}
                maxHeight={90}
              />
            )}
            {connected && (
              <span className="connection-badge">
                <span className="connection-dot" />
                Connected · {muted ? "Microphone muted" : "Microphone on"}
              </span>
            )}
          </div>
          {state === "Complete" ? (
            <div className="room-completion">
              <p>
                {completionReason === "candidate_ended_early"
                  ? "Your completed responses were saved. The company will see that the interview ended early."
                  : "Your responses have been submitted to the company."}
              </p>
              <p>You can safely close this window.</p>
            </div>
          ) : (
            <>
              {!consented && (
                <div className="interview-preflight">
                  <div className="interview-facts">
                    <span>15 minutes</span>
                    <span>English only</span>
                    <span>Voice conversation</span>
                  </div>
                  <p>
                    Mira will ask about your experience and how you approach
                    your work. Find a quiet spot and speak naturally.
                  </p>
                  <label className="consent-check">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(event) =>
                        setConsentAccepted(event.target.checked)
                      }
                    />
                    <span>
                      I consent to live microphone processing and transcript
                      storage. My transcript and evaluation will be shared with
                      the company.
                    </span>
                  </label>
                </div>
              )}
              {error && (
                <p className="error room-error" role="alert">
                  {error}
                </p>
              )}
              <div className={`room-controls ${consented ? "meet-dock" : ""}`}>
                {!consented ? (
                  showPreflightStartButton(consented, consentAccepted) ? (
                    <button
                      className="button button-primary room-start"
                      onClick={begin}
                      disabled={busy}
                    >
                      <Play size={18} weight="fill" /> Start interview
                    </button>
                  ) : null
                ) : (
                  <>
                    {(state === "Retrying" || state === "Ready") && (
                      <button className="button room-control" onClick={begin}>
                        {state === "Retrying" ? (
                          <ArrowClockwise size={20} />
                        ) : (
                          <Play size={20} weight="fill" />
                        )}
                        {state === "Retrying"
                          ? "Retry connection"
                          : initialElapsed
                            ? "Resume interview"
                            : "Start interview"}
                      </button>
                    )}
                    <button
                      className="button room-control mute-control"
                      onClick={toggleMute}
                      disabled={!connected}
                      aria-pressed={muted}
                    >
                      {muted ? (
                        <MicrophoneSlash size={20} weight="fill" />
                      ) : (
                        <Microphone size={20} weight="fill" />
                      )}{" "}
                      {muted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      className="button room-control"
                      onClick={() => setCaptions((value) => !value)}
                      aria-pressed={captions}
                    >
                      <ClosedCaptioning size={21} /> Transcript
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
      <ConfirmationDialog
        open={confirmEnd}
        title="End this interview?"
        description={
          normalizeCompletionReason("candidate_ended_early", seconds) ===
          "candidate_ended_early"
            ? "This is irreversible. Your completed responses will be submitted, and the report will show that the interview was closed before time."
            : "This is irreversible. Your responses will be submitted as a completed interview, and report generation will begin."
        }
        confirmLabel="End interview"
        busy={finishing.current}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => void finishInterview("candidate_ended_early")}
      />
    </main>
  );
}
