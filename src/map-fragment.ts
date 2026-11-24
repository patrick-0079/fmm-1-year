import type { Point, Rect } from "./core";

const fragments = new WeakMap<Point[], Rect & { mask: Path2D }>();

// All coordinates refer to the map, so one outline can be reused at any
// camera position and with either map resolution.
export function mapFragment(points: Point[]) {
  let fragment = fragments.get(points);
  if (!fragment) {
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
    const mask = new Path2D();
    mask.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) mask.lineTo(points[i].x, points[i].y);
    mask.closePath();
    fragment = { x, y, w: Math.ceil(Math.max(...xs)) - x, h: Math.ceil(Math.max(...ys)) - y, mask };
    fragments.set(points, fragment);
  }
  return fragment;
}
