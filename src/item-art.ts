import type { ItemId } from "./items";
import wreathUrl from "./assets/flower-wreath.webp";
import rewardsUrl from "./assets/reward-icons.webp";
export { wreathUrl, rewardsUrl };
export const rewardFrames = [
  { x: 75, y: 122, w: 493, h: 416 },
  { x: 663, y: 57, w: 546, h: 555 },
  { x: 45, y: 583, w: 598, h: 604 },
  { x: 646, y: 707, w: 585, h: 411 },
];
export function drawItem(
  c: CanvasRenderingContext2D,
  id: ItemId,
  x: number,
  y: number,
  w: number,
  h: number,
  wreath: HTMLImageElement,
  rewards: HTMLImageElement,
) {
  if (id === "anniversaryPin") {
    c.fillStyle = "#b67b39";
    c.fillRect(x + w * 0.25, y + h * 0.18, w * 0.5, h * 0.65);
    c.fillStyle = "#f6d67c";
    c.fillRect(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.55);
    c.fillStyle = "#d87c98";
    c.fillRect(x + w * 0.4, y + h * 0.32, w * 0.2, h * 0.25);
    return;
  }
  if (id === "wreath") {
    if (wreath.complete && wreath.naturalWidth)
      c.drawImage(wreath, x, y + h * 0.27, w, h * 0.45);
    return;
  }
  const index = { candyClip: 0, headphones: 1, moonBag: 2, starWings: 3 }[id];
  const f = rewardFrames[index];
  if (rewards.complete && rewards.naturalWidth)
    c.drawImage(rewards, f.x, f.y, f.w, f.h, x, y, w, h);
}
