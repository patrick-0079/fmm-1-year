import { canTravelBetween } from "../src/collision.ts";
import { meadowGround, meadowFlock, meadowStarSpot } from "../src/meadow-ground.ts";

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Leave enough space that E at either approach point still picks its own star.
const minimumGap = 42;

function safeGrass(point) {
  const approach = meadowStarSpot({ ...point, id: "" }).approach;
  if (!canTravelBetween(point, approach, meadowGround)) return false;
  if (meadowGround.spots.some(spot => distance(point, spot) < 60 || distance(point, spot.approach) < 42)) return false;
  // Keep the whole tent image and the sheep's short grazing paths clear.
  if (point.x > 70 && point.x < 213 && point.y > 65 && point.y < 178) return false;
  if (meadowFlock.some(sheep => distance(point, {x: sheep.x + 9, y: sheep.y - 5}) < 34)) return false;
  // Try a direct walk, then the clear grass south of the campsite.
  const spawn = meadowGround.spawn;
  const waypoints = [spawn, {x: 297, y: 294}, {x: 315, y: 235}];
  return waypoints.some(via => canTravelBetween(spawn, via, meadowGround)
    && canTravelBetween(via, approach, meadowGround));
}

function hash(text) {
  let value = 2166136261;
  for (const character of text) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  value ^= value >>> 16;
  return value >>> 0;
}

function grassCandidates() {
  const candidates = [];
  // A staggered lattice gives every candidate its own walk-up and click area.
  // Small seeded offsets soften the rows without reducing the minimum gap.
  for (let row = 0, y = 79; y <= 535; row++, y += 44) {
    for (let x = 57 + (row % 2) * 25; x <= 843; x += 50) {
      const seed = hash(`${x},${y}`);
      const point = {x: x + seed % 5 - 2, y: y + (seed >>> 8) % 5 - 2};
      if (safeGrass(point)) candidates.push(point);
    }
  }
  return candidates;
}

export function placeMeadowStars(records) {
  const positions = new Map();
  const occupied = [];
  for (const {id, position} of records) {
    if (!position) continue;
    if (!safeGrass(position) || occupied.some(other => distance(position, other) < minimumGap)) {
      throw new Error(`${id}: 固定落点无法安全拾取或与另一颗星太近，请调整或省略 position。`);
    }
    positions.set(id, position);
    occupied.push(position);
  }
  if (positions.size === records.length) return positions;
  const candidates = grassCandidates();
  for (const {id} of records) {
    if (positions.has(id)) continue;
    let best, bestRank = -1;
    for (const point of candidates) {
      const gap = occupied.reduce((nearest, other) => Math.min(nearest, distance(point, other)), Infinity);
      if (gap < minimumGap) continue;
      // Prefer a spacious site. Among equally spacious sites let the ID pick,
      // so edits to a nickname or message never change a star's location.
      const rank = Math.min(90, gap) + hash(`${id}/${point.x}/${point.y}`) / 0x100000000;
      if (rank > bestRank) { best = point; bestRank = rank; }
    }
    if (!best) throw new Error(`${id}: 花海没有足够的安全落点，请扩大可拾取草地后再扫描。`);
    positions.set(id, best);
    occupied.push(best);
  }
  return positions;
}
