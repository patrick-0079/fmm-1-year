import type { Point } from "./core.ts";
import type { Hotspot } from "./maps.ts";
/** Stable object hit anchor. Cosmetic glints and label placement never move it. */
export function interactionHitY(spot: Hotspot) {
  return spot.y - (spot.markerOffset ?? (spot.selfMarked ? 10 : 12));
}
/** Keep an in-range selection until another object is meaningfully closer. */
export function nearbyInteraction(player: Point, spots: Hotspot[], currentId = "") {
  const candidates = spots
    .filter(spot => Math.hypot(player.x - spot.x, player.y - spot.y) < (spot.radius ?? 48))
    .map(spot => ({ spot, distance: Math.min(
      Math.hypot(player.x - spot.x, player.y - spot.y),
      Math.hypot(player.x - spot.approach.x, player.y - spot.approach.y),
    ) }))
    .sort((a, b) => a.distance - b.distance);
  const closest = candidates[0], current = candidates.find(({spot}) => spot.id === currentId);
  return current && closest && current.distance - closest.distance < 8 ? current.spot : closest?.spot ?? null;
}
export function clickedInteraction(
  point: Point,
  spots: Hotspot[],
  markerY: (s: Hotspot) => number = interactionHitY,
) {
  // A visible object wins over a neighbour's touch margin. Where sprites
  // overlap, use their feet just as the map's depth painter does.
  const hits = [];
  for (const spot of spots) {
    const top = markerY(spot);
    const dy = Math.max(Math.min(top, spot.y) - point.y, point.y - Math.max(top, spot.y), 0);
    const distance = Math.hypot(spot.x - point.x, dy);
    const areas = spot.hitAreas;
    if (areas) {
      if (areas.some(a => point.x >= a.x && point.x <= a.x + a.w && point.y >= a.y && point.y <= a.y + a.h))
        hits.push({ spot, body: true, distance });
    } else if (distance < 28) {
      hits.push({ spot, body: distance <= 13, distance });
    }
  }
  return hits.sort((a, b) => Number(b.body) - Number(a.body)
    || (a.body && b.body ? b.spot.y - a.spot.y : 0)
    || a.distance - b.distance)[0]?.spot;
}
