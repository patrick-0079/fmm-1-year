import type { Point } from "./core.ts";
import type { Hotspot } from "./maps.ts";
export function clickedInteraction(
  point: Point,
  spots: Hotspot[],
  markerY: (s: Hotspot) => number,
) {
  return spots
    .filter(s => !s.hitAreas || s.hitAreas.some(a => point.x>=a.x && point.x<=a.x+a.w && point.y>=a.y && point.y<=a.y+a.h))
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
    .filter((v) => v.s.hitAreas || v.d < 28)
    .sort((a, b) => a.d - b.d)[0]?.s;
}
