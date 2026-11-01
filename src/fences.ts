import type { Obstacle, Point } from "./core.ts";
export function fenceSegments(
  label: string,
  coordinates: number[][],
  width = 4,
): Obstacle[] {
  const points: Point[] = coordinates.map(([x, y]) => ({ x, y }));
  return points.slice(1).map((b, i) => {
    const a = points[i],
      length = Math.hypot(b.x - a.x, b.y - a.y) || 1,
      nx = ((-(b.y - a.y) / length) * width) / 2,
      ny = (((b.x - a.x) / length) * width) / 2;
    return {
      label,
      points: [
        { x: a.x + nx, y: a.y + ny },
        { x: b.x + nx, y: b.y + ny },
        { x: b.x - nx, y: b.y - ny },
        { x: a.x - nx, y: a.y - ny },
      ],
    };
  });
}
