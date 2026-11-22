import type { Phase } from "./day.ts";

export interface DaylightMix {
  from: Phase;
  to: Phase;
  mix: number;
}

const anchors: readonly [number, Phase][] = [[5, "dawn"], [8, "day"], [17, "dusk"], [20, "night"]];

/** Center each change on the clock boundary; the entire fade lasts 20 real seconds. */
export function daylightMix(hour: number): DaylightMix {
  let previous: Phase = "night";
  for (const [at, phase] of anchors) {
    if (hour < at - 0.4) break;
    if (hour < at + 0.4) {
      return { from: previous, to: phase, mix: Math.max(0, Math.min(1, (hour - at + 0.4) / 0.8)) };
    }
    previous = phase;
  }
  return { from: previous, to: previous, mix: 0 };
}
