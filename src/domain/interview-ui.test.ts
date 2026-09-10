import { describe, expect, it } from "vitest";
import {
  activeInterviewState,
  barVisualizerState,
  candidateProcessingState,
  orbState,
  showPreflightStartButton,
  visualizerLevel,
} from "./interview-ui";

describe("interview visual state", () => {
  it.each(["Ready", "Connecting", "Retrying", "Complete"] as const)(
    "hides the voice graph during %s",
    (state) => expect(activeInterviewState(state)).toBe(false),
  );

  it.each(["Listening", "Transcribing", "Thinking", "Speaking"] as const)(
    "shows the voice graph during %s",
    (state) => expect(activeInterviewState(state)).toBe(true),
  );

  it("maps application states to ElevenLabs visual states", () => {
    expect(barVisualizerState("Listening")).toBe("listening");
    expect(barVisualizerState("Transcribing")).toBe("thinking");
    expect(barVisualizerState("Speaking")).toBe("speaking");
    expect(orbState("Speaking")).toBe("talking");
    expect(orbState("Thinking")).toBe("thinking");
    expect(orbState("Complete")).toBeNull();
  });

  it("uses fresh input while listening and fresh output while speaking", () => {
    const levels = { input: 0.2, output: 0.4, inputAt: 900, outputAt: 950 };
    expect(visualizerLevel(levels, "Listening", false, 1000)).toBe(1);
    expect(visualizerLevel(levels, "Speaking", false, 1000)).toBe(1);
    expect(visualizerLevel(levels, "Listening", true, 1000)).toBe(0);
    expect(visualizerLevel(levels, "Listening", false, 1300)).toBe(0);
  });

  it("shows the preflight start button only after consent is checked", () => {
    expect(showPreflightStartButton(false, false)).toBe(false);
    expect(showPreflightStartButton(false, true)).toBe(true);
    expect(showPreflightStartButton(true, true)).toBe(false);
  });

  it("keeps the listening UI during a short natural pause", () => {
    expect(candidateProcessingState(0)).toBe("Listening");
    expect(candidateProcessingState(1199)).toBe("Listening");
    expect(candidateProcessingState(1200)).toBe("Transcribing");
  });
});
