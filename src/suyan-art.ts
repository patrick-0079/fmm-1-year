/** Source alpha bounds of the two full-body poses, with a two-pixel gutter.
 * Both poses share the same hat-to-sole height; the feet, not the wide hat,
 * determine the world anchor. Keep the original atlas dimensions unchanged. */
export const suyanFrames = [
  { x: 219, y: 24, w: 472, h: 839, footX: 449, footY: 860, headY: 26 },
  { x: 1091, y: 24, w: 487, h: 839, footX: 1328, footY: 860, headY: 26 },
] as const;

export function suyanPlacement(pose: number, x: number, y: number, height: number) {
  const frame = suyanFrames[pose === 1 ? 1 : 0];
  const scale = height / (frame.footY - frame.headY);
  return { frame, x: x - (frame.footX - frame.x) * scale,
    y: y - (frame.footY - frame.y) * scale, w: frame.w * scale, h: frame.h * scale };
}

/** Shared rendering for the map and the dialogue portrait. */
export function drawSuyan(c: CanvasRenderingContext2D, image: HTMLImageElement,
  x: number, y: number, height: number, pose = 0) {
  if (!image.complete || !image.naturalWidth) return false;
  const p = suyanPlacement(pose, x, y, height), f = p.frame;
  c.drawImage(image, f.x, f.y, f.w, f.h, p.x, p.y, p.w, p.h);
  return true;
}
