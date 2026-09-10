"use client";

import { useEffect, useState, type RefObject } from "react";
import { Waveform } from "./ui/waveform";

export type AudioMeter = {
  input: number;
  output: number;
  inputAt: number;
  outputAt: number;
};

export function AudioWaveform({
  levels,
  active,
  muted,
  speaking,
}: {
  levels: RefObject<AudioMeter>;
  active: boolean;
  muted: boolean;
  speaking: boolean;
}) {
  const [samples, setSamples] = useState<number[]>(Array(64).fill(0));
  useEffect(() => {
    if (!active) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const input =
        muted || now - levels.current.inputAt > 250 ? 0 : levels.current.input;
      const output =
        now - levels.current.outputAt > 250 ? 0 : levels.current.output;
      const volume = Math.min(1, Math.max(0, (speaking ? output : input) * 5));
      setSamples((previous) => [...previous.slice(1), volume]);
    }, 80);
    return () => window.clearInterval(timer);
  }, [active, muted, speaking, levels]);
  return (
    <div className="audio-waveform" aria-hidden="true">
      <Waveform
        data={active ? samples : []}
        height={88}
        barWidth={3}
        barGap={4}
        barRadius={3}
      />
    </div>
  );
}
