import type { Phase } from "./day";

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
  if (phase === "night") return; // Original moon, clouds and stars are the night scene.
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
  const colors =
    phase === "dawn"
      ? ["#b0cbdc", "#f9ddbe"]
      : phase === "dusk"
        ? ["#8a91bc", "#efbcb4"]
        : ["#83c5de", "#d8e9db"];
  const sky = c.createLinearGradient(0, 10, 0, 65);
  sky.addColorStop(0, colors[0]);
  sky.addColorStop(1, colors[1]);
  c.fillStyle = sky;
  c.fillRect(220, 10, 160, 57);
  c.fillStyle = "#ffefb2";
  c.beginPath();
  c.arc(306, phase === "day" ? 24 : 41, 7, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#fff8e8b8";
  for (const [x, y, w] of [
    [250, 44, 20],
    [294, 56, 29],
    [347, 36, 25],
  ]) {
    c.beginPath();
    c.ellipse(x, y, w, 4, 0, 0, Math.PI * 2);
    c.ellipse(x - 5, y - 3, w * 0.5, 5, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}
