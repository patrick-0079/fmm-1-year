import type { Point } from "./core.ts";
import type { Hotspot } from "./maps.ts";
/** Stable object hit anchor. Cosmetic glints and label placement never move it. */
export function interactionHitY(spot: Hotspot) {
  return spot.y - (spot.markerOffset ?? (spot.selfMarked ? 10 : 12));
}
/** Keep an in-range selection until another object is meaningfully closer. */
export function nearbyInteraction(player: Point, spots: Hotspot[], currentId = "") {
  const candidates = spots.map(spot => ({spot, distance: Math.hypot(player.x - spot.x, player.y - spot.y)}))
    .filter(({spot, distance}) => distance < (spot.radius ?? 48))
    .sort((a, b) => a.distance - b.distance);
  const closest = candidates[0], current = candidates.find(({spot}) => spot.id === currentId);
  return current && closest && current.distance - closest.distance < 8 ? current.spot : closest?.spot ?? null;
}
export function clickedInteraction(
  point: Point,
  spots: Hotspot[],
  markerY: (s: Hotspot) => number = interactionHitY,
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
