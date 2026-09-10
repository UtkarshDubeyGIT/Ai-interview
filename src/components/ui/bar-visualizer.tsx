"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import type { AudioLevels, InterviewUiState } from "@/domain/interview-ui";
import { visualizerLevel } from "@/domain/interview-ui";

export function BarVisualizer({
  state,
  levels,
  muted,
  barCount = 20,
  minHeight = 15,
  maxHeight = 90,
}: {
  state: InterviewUiState;
  levels: RefObject<AudioLevels>;
  muted: boolean;
  barCount?: number;
  minHeight?: number;
  maxHeight?: number;
}) {
  const [frame, setFrame] = useState({ level: 0, tick: 0 });
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      setFrame(({ tick }) => ({
        level: visualizerLevel(levels.current, state, muted, performance.now()),
        tick: tick + 1,
      }));
    }, 70);
    return () => window.clearInterval(timer);
  }, [levels, muted, state]);

  const heights = useMemo(
    () =>
      Array.from({ length: barCount }, (_, index) => {
        const center =
          1 - Math.abs(index - (barCount - 1) / 2) / (barCount / 2);
        const motion = (Math.sin(frame.tick * 0.55 + index * 1.7) + 1) / 2;
        const thinking =
          state === "Thinking" || state === "Transcribing"
            ? 0.2 + motion * 0.22
            : 0;
        const amplitude = Math.max(
          frame.level * (0.35 + motion * 0.65),
          thinking,
        );
        return Math.round(
          minHeight +
            (maxHeight - minHeight) * amplitude * (0.62 + center * 0.38),
        );
      }),
    [barCount, frame, maxHeight, minHeight, state],
  );

  return (
    <div className="bar-visualizer" aria-hidden="true">
      {heights.map((height, index) => (
        <span key={index} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}
