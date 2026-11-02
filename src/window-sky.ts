import type { Phase } from "./day";
import { sceneArt } from "./scene-art";

const masks = new WeakMap<HTMLImageElement, Path2D>();
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
  phase: Phase,
  artwork?: HTMLImageElement,
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
  const index = { dawn: 0, day: 1, dusk: 2, night: 3 }[phase];
  c.imageSmoothingEnabled = false;
  c.drawImage(sky, index % 2 * 768, Math.floor(index / 2) * 512 + 28,
    768, 317, 220, 0, 160, 66);
  c.restore();
}
