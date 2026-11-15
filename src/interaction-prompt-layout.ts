export interface PromptPoint { x: number; y: number }
export interface PromptBox extends PromptPoint { w: number; h: number }
export interface PromptPlacement extends PromptPoint {
  edge: "top" | "right" | "bottom" | "left";
  tip: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const overlap = (a: PromptBox, b: PromptBox) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** A hover bridge only; it does not expand the object's clickable geometry.
 * Any straight mouse path from the illustrated object to its sign stays in
 * this convex hull, even when the sign has moved aside to avoid the player.
 */
export function promptHoverContains(point: PromptPoint, object: PromptBox, label: PromptBox) {
  const corners = (box: PromptBox) => [
    { x: box.x - 3, y: box.y - 3 }, { x: box.x + box.w + 3, y: box.y - 3 },
    { x: box.x + box.w + 3, y: box.y + box.h + 3 }, { x: box.x - 3, y: box.y + box.h + 3 },
  ];
  const cross = (a: PromptPoint, b: PromptPoint, c: PromptPoint) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const points = [...corners(object), ...corners(label)].sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (list: PromptPoint[]) => {
    const hull: PromptPoint[] = [];
    for (const p of list) {
      while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
      hull.push(p);
    }
    return hull.slice(0, -1);
  };
  const hull = [...half(points), ...half([...points].reverse())];
  return hull.length >= 3 && hull.every((p, index) => cross(p, hull[(index + 1) % hull.length], point) >= -.001);
}

/** CSS-pixel placement, independent of canvas density, camera zoom and pointer hit boxes. */
export function placeInteractionPrompt(
  viewport: { w: number; h: number },
  size: { w: number; h: number },
  anchor: PromptPoint,
  player: PromptBox,
  object: PromptBox,
  obstacles: PromptBox[] = [],
): PromptPlacement {
  const margin = 6, gap = 8,
    w = Math.min(size.w, Math.max(0, viewport.w - margin * 2)),
    h = Math.min(size.h, Math.max(0, viewport.h - margin * 2));
  // Side-above positions stay close to the object; the other candidates let
  // the sign move around a player standing directly in front of it.
  const candidates: PromptPoint[] = [
    { x: object.x + object.w + gap, y: anchor.y - h - gap },
    { x: object.x - w - gap, y: anchor.y - h - gap },
    { x: anchor.x - w / 2, y: object.y - h - gap },
    { x: object.x + object.w + gap, y: anchor.y - h / 2 },
    { x: object.x - w - gap, y: anchor.y - h / 2 },
    { x: anchor.x - w / 2, y: object.y + object.h + gap },
  ];
  for (const obstacle of obstacles) {
    candidates.push(
      { x: obstacle.x + obstacle.w + gap, y: anchor.y - h - gap },
      { x: obstacle.x - w - gap, y: anchor.y - h - gap },
      { x: anchor.x - w / 2, y: obstacle.y + obstacle.h + gap },
      { x: anchor.x - w / 2, y: obstacle.y - h - gap },
    );
  }
  const best = candidates.map((point, index) => {
    const box = {
      x: clamp(point.x, margin, Math.max(margin, viewport.w - margin - w)),
      y: clamp(point.y, margin, Math.max(margin, viewport.h - margin - h)), w, h,
    };
    const nearest = {
      x: clamp(anchor.x, box.x, box.x + w),
      y: clamp(anchor.y, box.y, box.y + h),
    };
    const score = overlap(box, player) * 16 + overlap(box, object) * 5 +
      obstacles.reduce((sum, obstacle) => sum + overlap(box, obstacle) * 24, 0) +
      Math.hypot(nearest.x - anchor.x, nearest.y - anchor.y) +
      Math.hypot(box.x - point.x, box.y - point.y) * .15 + index * 4;
    return { box, score };
  }).sort((a, b) => a.score - b.score)[0].box;
  const dx = anchor.x - (best.x + w / 2), dy = anchor.y - (best.y + h / 2);
  const horizontalGap = Math.max(0, Math.abs(dx) - w / 2),
    verticalGap = Math.max(0, Math.abs(dy) - h / 2);
  const horizontal = horizontalGap || verticalGap
    ? horizontalGap > verticalGap
    : Math.abs(dx) / Math.max(w, 1) > Math.abs(dy) / Math.max(h, 1);
  const edge = horizontal
    ? dx < 0 ? "left" : "right"
    : dy < 0 ? "top" : "bottom";
  const along = edge === "left" || edge === "right" ? anchor.y - best.y : anchor.x - best.x;
  const length = edge === "left" || edge === "right" ? h : w;
  return { x: Math.round(best.x), y: Math.round(best.y), edge, tip: clamp(along, 10, Math.max(10, length - 10)) };
}
