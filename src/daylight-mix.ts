import { DAY_SECONDS, type Phase } from "./day.ts";

export interface DaylightMix {
  from: Phase;
  to: Phase;
  mix: number;
}

const anchors: readonly [number, Phase][] = [[5, "dawn"], [8, "day"], [17, "dusk"], [20, "night"]];
const halfFadeHours = 10 * 24 / DAY_SECONDS;

/** Center each change on the clock boundary; the entire fade lasts 20 real seconds. */
export function daylightMix(hour: number): DaylightMix {
  let previous: Phase = "night";
  for (const [at, phase] of anchors) {
    const start = at - halfFadeHours, end = at + halfFadeHours;
    if (hour < start) break;
    if (hour < end) {
      return { from: previous, to: phase, mix: (hour - start) / (end - start) };
    }
    previous = phase;
  }
  return { from: previous, to: previous, mix: 0 };
}
