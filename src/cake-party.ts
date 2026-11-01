import type { Point } from "./core.ts";
export const cakeGuides: [Point, Point][] = [
  [
    { x: 300, y: 193 },
    { x: 300, y: 221 },
  ],
  [
    { x: 280, y: 199 },
    { x: 320, y: 215 },
  ],
  [
    { x: 280, y: 215 },
    { x: 320, y: 199 },
  ],
];
/** Require a real stroke that follows the indicated line in either direction. */
export function followsCakeGuide(points: Point[], index: number) {
  const guide = cakeGuides[index];
  if (!guide || points.length < 3) return false;
  const [a, b] = guide,
    dx = b.x - a.x,
    dy = b.y - a.y,
    length = Math.hypot(dx, dy);
  const projections = points.map(
    (p) => ((p.x - a.x) * dx + (p.y - a.y) * dy) / (length * length),
  );
  if (Math.min(...projections) > 0.14 || Math.max(...projections) < 0.86)
    return false;
  if (
    Math.hypot(points[0].x - points.at(-1)!.x, points[0].y - points.at(-1)!.y) <
    length * 0.7
  )
    return false;
  return points.every((p) => {
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (length * length)),
    );
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) < 4.5;
  });
}
export const cakePlates = Array.from({ length: 6 }, (_, i) => ({
  x: 239 + (i % 2) * 18,
  y: 222 + Math.floor(i / 2) * 15,
}));
export function drawCakeSlice(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 1,
  image?: HTMLImageElement,
) {
  if (image?.complete && image.naturalWidth) {
    c.drawImage(
      image,
      45,
      56,
      1226,
      1095,
      x - 8 * size,
      y - 11 * size,
      16 * size,
      14.3 * size,
    );
    return;
  }
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  c.fillStyle = "#dabc9c";
  c.beginPath();
  c.ellipse(0, 3, 8, 4, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#fff5e1";
  c.beginPath();
  c.ellipse(0, 2, 7.5, 3.5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#d4859f";
  c.beginPath();
  c.moveTo(-5, -3);
  c.lineTo(5, -3);
  c.lineTo(2, 2);
  c.lineTo(-5, 0);
  c.closePath();
  c.fill();
  c.fillStyle = "#fff0cc";
  c.fillRect(-5, -2, 6, 1);
  c.fillStyle = "#f2b8c9";
  c.fillRect(-5, -1, 6, 1);
  c.fillStyle = "#fff8df";
  c.beginPath();
  c.moveTo(-5, -3);
  c.lineTo(-1, -7);
  c.lineTo(5, -3);
  c.lineTo(1, -1);
  c.closePath();
  c.fill();
  c.fillStyle = "#dd6c86";
  c.beginPath();
  c.ellipse(-1, -5, 1.8, 2, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#8eb78c";
  c.fillRect(-2, -7, 2, 1);
  c.restore();
}
