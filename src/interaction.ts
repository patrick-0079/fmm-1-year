import type { Point } from "./core.ts";
import type { Hotspot } from "./maps.ts";
export function clickedInteraction(
  point: Point,
  spots: Hotspot[],
  markerY: (s: Hotspot) => number,
) {
  return spots
    .map((s) => ({
      s,
      d: Math.hypot(
        s.x - point.x,
        Math.max(
          Math.min(markerY(s), s.y),
          Math.min(point.y, Math.max(markerY(s), s.y)),
        ) - point.y,
      ),
    }))
    .filter((v) => v.d < 28)
    .sort((a, b) => a.d - b.d)[0]?.s;
}
