import type { Phase } from "./day.ts";
import { sceneLights } from "./lights.ts";

const anchors: readonly [number, Phase][] = [
  [5, "dawn"],
  [8, "day"],
  [17, "dusk"],
  [20, "night"],
];
/** A short sunrise or sunset blends across the phase boundary, including midnight. */
export function townLightMix(hour: number): {
  from: Phase;
  to: Phase;
  mix: number;
} {
  let previous: Phase = "night";
  for (const [at, phase] of anchors) {
    if (hour < at - 0.4) break;
    if (hour < at + 0.4)
      return {
        from: previous,
        to: phase,
        mix: Math.min(1, Math.max(0, (hour - at + 0.4) / 0.8)),
      };
    previous = phase;
  }
  return { from: previous, to: previous, mix: 0 };
}
const palettes: Record<Phase, [string, string, string, number]> = {
  dawn: ["#ffe3a286", "#ffd6b032", "#a1c8c039", 0.14],
  day: ["#fff8da0b", "#fff4c208", "#e6f6ff08", 0],
  dusk: ["#e88a62a3", "#eb9a8055", "#a383bc70", 0.64],
  night: ["#3a699d91", "#48568d89", "#67569092", 1],
};
const skies = new Map<Phase, HTMLCanvasElement>();
function sky(phase: Phase) {
  const cached = skies.get(phase);
  if (cached) return cached;
  const image = document.createElement("canvas");
  image.width = 768;
  image.height = 512;
  const c = image.getContext("2d")!;
  c.scale(0.5, 0.5);
  const [west, mid, east, power] = palettes[phase];
  const field = c.createLinearGradient(
    phase === "dawn" ? 1536 : 0,
    30,
    phase === "dawn" ? 0 : 1536,
    830,
  );
  field.addColorStop(0, west);
  field.addColorStop(0.55, mid);
  field.addColorStop(1, east);
  c.fillStyle = field;
  c.fillRect(0, 0, 1536, 1024);
  // Keep the cobbles around real lamps and shop doors bright as the street turns blue.
  for (const l of sceneLights.town) {
    if (!power) break;
    const r = l.radius * (phase === "night" ? 1.06 : 0.86);
    const pool = (inner: string, middle: string, outer: string) => {
      const g = c.createRadialGradient(l.x, l.y, 1, l.x, l.y, r);
      g.addColorStop(0, inner);
      g.addColorStop(0.42, middle);
      g.addColorStop(1, outer);
      c.fillStyle = g;
      c.fillRect(l.x - r, l.y - r, 2 * r, 2 * r);
    };
    c.globalCompositeOperation = "destination-out";
    c.globalAlpha = power;
    pool("#000000ea", "#00000080", "#00000000");
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = power;
    pool("#ffe6a9b5", "#ffc5754f", "#ffce8300");
  }
  c.globalAlpha = 1;
  skies.set(phase, image);
  return image;
}
export function drawTownLight(
  c: CanvasRenderingContext2D,
  hour: number,
  time: number,
  still: boolean,
) {
  const { from, to, mix } = townLightMix(hour);
  c.save();
  if (from !== to && mix > 0) c.globalAlpha = 1 - mix;
  c.drawImage(sky(from), 0, 0, 1536, 1024);
  if (from !== to) {
    c.globalAlpha = mix;
    c.drawImage(sky(to), 0, 0, 1536, 1024);
  }
  const night = (from === "night" ? 1 - mix : 0) + (to === "night" ? mix : 0);
  if (night > 0.05) {
    // Quiet fireflies over the water and hedges, not across the whole street.
    const t = still ? 0 : time;
    for (const [bx, by] of [
      [289, 612],
      [558, 509],
      [782, 440],
      [1056, 693],
      [1321, 814],
    ])
      for (let i = 0; i < 4; i++) {
        const x = bx + Math.sin(i * 2.5 + t * 0.21) * 22,
          y = by + Math.cos(i * 1.6 + t * 0.29) * 8;
        c.globalAlpha = night * (0.5 + 0.28 * Math.sin(i * 1.9 + t));
        c.fillStyle = "#f8eda1";
        c.fillRect(x, y, 2.5, 2);
      }
  }
  c.restore();
}
