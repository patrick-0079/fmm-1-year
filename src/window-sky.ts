import type { Phase } from "./day";
import type { DaylightMix } from "./daylight-mix";
import { sceneArt } from "./scene-art";

const masks = new WeakMap<HTMLImageElement, Path2D>();
const clouds = new Map<Phase, HTMLCanvasElement>();

// Take one of the actual painted wisps from the day sky. Its little stepped
// edges and shadows keep the moving cloud in the same style as the still sky.
function cloudSprite(sky: HTMLImageElement, phase: Phase) {
  const cached = clouds.get(phase);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 108;
  canvas.height = 45;
  const c = canvas.getContext("2d", {willReadFrequently: true})!;
  c.drawImage(sky, 1069, 14, 108, 45, 0, 0, 108, 45);
  const pixels = c.getImageData(0, 0, 108, 45);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i];
    pixels.data[i + 3] = Math.max(0, Math.min(255, (r - 84) * 4.5));
    if (phase !== "day") {
      pixels.data[i] = Math.min(255, r * .76 + 65);
      pixels.data[i + 1] *= phase === "dusk" ? .73 : .93;
      pixels.data[i + 2] *= phase === "dusk" ? .84 : .87;
    }
  }
  c.putImageData(pixels, 0, 0);
  clouds.set(phase, canvas);
  return canvas;
}

function skyMotion(c: CanvasRenderingContext2D, sky: HTMLImageElement, phase: Phase, time: number) {
  if (phase !== "night") {
    const x = 198 + ((time + 8) % 24) * 7.6;
    c.globalAlpha *= .86;
    c.drawImage(cloudSprite(sky, phase), x, 17 + .8 * Math.sin(time * .16), 34, 14);
    return;
  }
  const base = c.globalAlpha;
  for (const [x, y, delay, size] of [[286, 19, 0, 1], [350, 25, 3.5, .75]]) {
    const light = (1 + Math.cos((time + delay) * Math.PI * 2 / 7)) / 2;
    c.globalAlpha = base * (.25 + light * .65);
    c.fillStyle = "#d4deff";
    c.fillRect(x - size * 1.5, y, size * 3, size);
    c.fillRect(x - size * .5, y - size, size, size * 3);
    c.fillStyle = "#fff4c9";
    c.fillRect(x - size * .5, y, size, size);
  }
}
function glassMask(artwork: HTMLImageElement) {
  const saved = masks.get(artwork);
  if (saved) return saved;
  const scratch = document.createElement("canvas");
  scratch.width = 400;
  scratch.height = 34;
  const context = scratch.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(artwork, 570, 132, 400, 34, 0, 0, 400, 34);
  const pixels = context.getImageData(0, 0, 400, 34).data;
  const mask = new Path2D();
  const scale = 600 / 1536;
  mask.rect(220, 0, 160, 132 * scale);
  // At the sill, replace sky pixels only. Preserve the actual flowers and leaves
  // instead of restoring a rectangular patch of the original night background.
  for (let y = 0; y < 34; y++)
    for (let x = 0; x < 400; x++) {
      const i = (y * 400 + x) * 4;
      const [r, g, b] = pixels.subarray(i, i + 3);
      if (b > r * 1.04 && b > g * 0.97)
        mask.rect((570 + x) * scale, (132 + y) * scale, scale, scale);
    }
  masks.set(artwork, mask);
  return mask;
}

/** Trace the actual glass, leaving the mullions, curtains and sill untouched. */
export function drawRoomWindow(
  c: CanvasRenderingContext2D,
  phase: Phase | DaylightMix,
  artwork?: HTMLImageElement,
  time = 0,
) {
  const sky = sceneArt.skies;
  if (!sky.complete || !sky.naturalWidth) return;
  const scale = 600 / 1536;
  const panes = [
    [
      [610, 28],
      [677, 28],
      [677, 165],
      [604, 165],
      [604, 70],
      [605, 55],
      [608, 40],
    ],
    [
      [691, 29],
      [864, 29],
      [864, 164],
      [691, 164],
    ],
    [
      [878, 28],
      [930, 28],
      [933, 40],
      [936, 55],
      [941, 70],
      [939, 85],
      [941, 100],
      [941, 165],
      [878, 165],
    ],
  ];
  c.save();
  c.beginPath();
  for (const pane of panes) {
    pane.forEach(([x, y], i) =>
      i ? c.lineTo(x * scale, y * scale) : c.moveTo(x * scale, y * scale),
    );
    c.closePath();
  }
  c.clip();
  if (artwork?.complete && artwork.naturalWidth) c.clip(glassMask(artwork));
  c.imageSmoothingEnabled = false;
  const paneSky = (stop: Phase, opacity: number) => {
    const index = { dawn: 0, day: 1, dusk: 2, night: 3 }[stop];
    c.save();
    c.globalAlpha *= opacity;
    c.drawImage(sky, index % 2 * 768, Math.floor(index / 2) * 512 + 28,
      768, 317, 220, 0, 160, 66);
    skyMotion(c, sky, stop, time);
    c.restore();
  };
  if (typeof phase === "string") paneSky(phase, 1);
  else {
    paneSky(phase.from, 1);
    if (phase.mix > 0) paneSky(phase.to, phase.mix);
  }
  c.restore();
}
