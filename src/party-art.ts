import partyUrl from "./assets/party-props-v11.webp";
import { fitItem } from "./equipment";
const party = new Image();
party.src = partyUrl;
export const partyFrames = [
  [39, 46, 302, 531],
  [421, 28, 313, 551],
  [831, 55, 264, 523],
  [1218, 21, 270, 586],
  [14, 593, 370, 404],
  [406, 606, 352, 386],
  [780, 607, 363, 391],
  [1164, 614, 361, 387],
];
export function drawPartyProp(
  c: CanvasRenderingContext2D,
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!party.complete || !party.naturalWidth) return;
  const [sx, sy, sw, sh] = partyFrames[index],
    b = fitItem(sw, sh, x, y, w, h);
  c.drawImage(party, sx, sy, sw, sh, b.x, b.y, b.w, b.h);
}

/** A piece of the existing strawberry wrapping, used on the removable lid. */
export function drawGiftPaper(c: CanvasRenderingContext2D, path: Path2D) {
  if (!party.complete || !party.naturalWidth) return;
  c.save(); c.clip(path); c.globalAlpha *= .34;
  // Sample the flowered panel, away from the satin bands and the box outlines.
  for (let x = -34; x < 34; x += 9)
    for (let y = -60; y < -22; y += 12)
      c.drawImage(party, 144, 819, 45, 60, x, y, 9, 12);
  c.restore();
}
