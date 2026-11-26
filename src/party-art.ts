import partyUrl from "./assets/party-props-v11.webp";
import { sceneImage } from "./texture-cache";
import { fitItem } from "./equipment";
import { sceneArt } from "./scene-art";
const party = sceneImage(partyUrl);
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
  const [sx, sy, sw, sh] = partyFrames[index];
  const b = fitItem(sw, sh, x, y, w, h);
  const balloons = sceneArt.balloonMap;
  // All map balloon poses fit within 62 units, including a fully inflated garden balloon.
  if (index < 4 && h <= 62 && balloons.naturalWidth) {
    const cell = balloons.naturalWidth / 4, height = balloons.naturalHeight;
    const width = Math.round(height * sw / sh);
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(balloons, index * cell, 0, width, height, b.x, b.y, b.w, b.h);
    c.restore();
    return;
  }
  if (!party.complete || !party.naturalWidth) return;
  c.drawImage(party, sx, sy, sw, sh, b.x, b.y, b.w, b.h);
}
