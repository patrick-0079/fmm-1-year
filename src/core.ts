import { rainbowIds } from "./rainbow-flowers.ts";
import { producers } from "./content.ts";
import { ARCADES } from "./town-data.ts";
import type { GameId } from "./arcade-engines.ts";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}
export type Obstacle =
  (Rect & { label?: string }) | { points: Point[]; label?: string };
export interface Geometry {
  bounds: Rect;
  walls: Obstacle[];
  floor?: Point[];
  /** Union of paved surfaces; absent for maps whose lawns are walkable. */
  surfaces?: Point[][];
}
export interface Hazard {
  id: string;
  title: string;
  kind: "ribbon" | "stone" | "mist" | "wind";
  x: number;
  y: number;
  radius: number;
}
export interface Checkpoint {
  id: string;
  title: string;
  x: number;
  y: number;
}
export interface Progress {
  visited: string[];
  completed: string[];
  sound: boolean;
  bassSound: boolean;
  bgm: boolean;
  volume: number;
  bedNoteUnlocked: boolean;
  bassSongPlayed: boolean;
  rainbowFlowers: string[];
  creditStars: string[];
  arcadeBests: Partial<Record<GameId, number>>;
}
export const SAVE_KEY = "nemu-anniversary-v1";
export const PLAYER_RADIUS = 5;
export const PLAYER_SPEED = 78;
export const GAME_IDS = [
  "cake",
  "gifts",
  "balloons",
  "fireworks",
  "courage",
] as const;
export const EVENT_IDS = [
  ...GAME_IDS,
  "letters",
  "album",
  "radio",
  "tv",
  "danmaku",
  "bili",
];

export function readProgress(raw: string | null): Progress {
  const clean: Progress = {
    visited: [],
    completed: [],
    sound: true,
    bassSound: true,
    bgm: true,
    volume: 0.45,
    bedNoteUnlocked: false,
    bassSongPlayed: false,
    rainbowFlowers: [],
    creditStars: [],
    arcadeBests: {},
  };
  if (!raw) return clean;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return clean;
    const p = data as Partial<Progress>;
    const valid = (list: unknown, allowed: readonly string[]) =>
      Array.isArray(list)
        ? [
            ...new Set(
              list.filter(
                (x): x is string =>
                  typeof x === "string" && allowed.includes(x),
              ),
            ),
          ]
        : [];
    return {
      visited: valid(p.visited, EVENT_IDS),
      completed: valid(p.completed, GAME_IDS),
      sound: p.sound === true,
      bassSound: p.bassSound !== false,
      bedNoteUnlocked: p.bedNoteUnlocked === true,
      bassSongPlayed: p.bassSongPlayed === true,
      rainbowFlowers: valid(Array.isArray(p.rainbowFlowers)
        ? p.rainbowFlowers.map(id => id === "prism-poppy" ? "prism-calendula" : id)
        : [], rainbowIds),
      creditStars: valid(p.creditStars, producers.map(p => p.id)),
      arcadeBests: Object.fromEntries(Object.entries(p.arcadeBests ?? {}).filter(([id, score]) =>
        Object.hasOwn(ARCADES, id) && Number.isSafeInteger(score) && score > 0)),
      bgm: typeof p.bgm === "boolean" ? p.bgm : p.sound === true,
      volume:
        typeof p.volume === "number" && Number.isFinite(p.volume)
          ? Math.max(0, Math.min(1, p.volume))
          : 0.45,
    };
  } catch {
    return clean;
  }
}
export function polygonContains(point: Point, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function edgeDistance(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
function polygonEdgeDistance(point: Point, points: Point[]) {
  return Math.min(
    ...points.map((a, i) =>
      edgeDistance(point, a, points[(i + 1) % points.length]),
    ),
  );
}
const surfaceBounds = new WeakMap<
  Point[][],
  { points: Point[]; bounds: Rect }[]
>();
function onSurface(point: Point, surfaces: Point[][]) {
  let index = surfaceBounds.get(surfaces);
  if (!index) {
    index = surfaces.map((points) => {
      const xs = points.map((p) => p.x),
        ys = points.map((p) => p.y);
      const x = Math.min(...xs),
        y = Math.min(...ys);
      return {
        points,
        bounds: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y },
      };
    });
    surfaceBounds.set(surfaces, index);
  }
  return index.some(
    ({ points, bounds: b }) =>
      point.x >= b.x &&
      point.x <= b.x + b.w &&
      point.y >= b.y &&
      point.y <= b.y + b.h &&
      polygonContains(point, points),
  );
}
export function obstacleContainsFoot(point: Point, obstacle: Obstacle) {
  if ("points" in obstacle)
    return (
      polygonContains(point, obstacle.points) ||
      polygonEdgeDistance(point, obstacle.points) < PLAYER_RADIUS - 1e-6
    );
  const x = Math.max(obstacle.x, Math.min(point.x, obstacle.x + obstacle.w));
  const y = Math.max(obstacle.y, Math.min(point.y, obstacle.y + obstacle.h));
  return Math.hypot(point.x - x, point.y - y) < PLAYER_RADIUS - 1e-6;
}
export function canStand(
  point: Point,
  walls: Obstacle[],
  bounds: Rect,
  floor?: Point[],
  surfaces?: Point[][],
): boolean {
  if (
    point.x - PLAYER_RADIUS < bounds.x ||
    point.x + PLAYER_RADIUS > bounds.x + bounds.w ||
    point.y - PLAYER_RADIUS < bounds.y ||
    point.y + PLAYER_RADIUS > bounds.y + bounds.h
  )
    return false;
  if (
    floor &&
    (!polygonContains(point, floor) ||
      polygonEdgeDistance(point, floor) < PLAYER_RADIUS - 1e-6)
  )
    return false;
  if (surfaces) {
    // Test the complete foot against the union, so joining street polygons do
    // not create invisible seams, while planted edges still stop movement.
    for (let i = -1; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const p =
        i < 0
          ? point
          : {
              x: point.x + Math.cos(a) * PLAYER_RADIUS,
              y: point.y + Math.sin(a) * PLAYER_RADIUS,
            };
      if (!onSurface(p, surfaces)) return false;
    }
  }
  return !walls.some((wall) => obstacleContainsFoot(point, wall));
}
export function touchingHazard(
  point: Point,
  hazards: Hazard[],
  padding = PLAYER_RADIUS,
): Hazard | undefined {
  return hazards.find(
    (h) => Math.hypot(point.x - h.x, point.y - h.y) < h.radius + padding,
  );
}
const clampedDelta = (delta: number) => Math.min(Math.max(delta, 0), 0.05);
export function movePlayer(
  point: Point,
  input: Point,
  delta: number,
  walls: Obstacle[],
  bounds: Rect,
  floor?: Point[],
  surfaces?: Point[][],
): Point {
  const length = Math.hypot(input.x, input.y);
  if (!length) return { ...point };
  const distance = PLAYER_SPEED * clampedDelta(delta),
    steps = Math.max(1, Math.ceil(distance / 2));
  const dx = ((input.x / length) * distance) / steps,
    dy = ((input.y / length) * distance) / steps;
  const next = { ...point };
  for (let i = 0; i < steps; i++) {
    const horizontal = { x: next.x + dx, y: next.y };
    if (
      canStand(horizontal, walls, bounds, floor, surfaces) &&
      (!surfaces || travelOnSurfaces(next, horizontal, surfaces))
    )
      next.x += dx;
    const vertical = { x: next.x, y: next.y + dy };
    if (
      canStand(vertical, walls, bounds, floor, surfaces) &&
      (!surfaces || travelOnSurfaces(next, vertical, surfaces))
    )
      next.y += dy;
  }
  return next;
}
export function canTravelBetween(
  start: Point,
  end: Point,
  geometry: Geometry,
  hazards: Hazard[] = [],
): boolean {
  if (geometry.surfaces && !travelOnSurfaces(start, end, geometry.surfaces))
    return false;
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 2),
  );
  for (let i = 0; i <= steps; i++) {
    const point = {
      x: start.x + ((end.x - start.x) * i) / steps,
      y: start.y + ((end.y - start.y) * i) / steps,
    };
    if (
      !canStand(point, geometry.walls, geometry.bounds, geometry.floor) ||
      touchingHazard(point, hazards, PLAYER_RADIUS + 2)
    )
      return false;
  }
  return true;
}
/** Validate every interval between polygon crossings, including sub-pixel seams. */
function travelOnSurfaces(start: Point, end: Point, surfaces: Point[][]) {
  const dx = end.x - start.x,
    dy = end.y - start.y;
  for (let probe = -1; probe < 12; probe++) {
    const angle = (probe * Math.PI) / 6;
    const a = {
      x: start.x + (probe < 0 ? 0 : Math.cos(angle) * PLAYER_RADIUS),
      y: start.y + (probe < 0 ? 0 : Math.sin(angle) * PLAYER_RADIUS),
    };
    const b = { x: a.x + dx, y: a.y + dy };
    if (!onSurface(a, surfaces) || !onSurface(b, surfaces)) return false;
    const cuts = [0, 1];
    for (const { points, bounds: r } of surfaceBounds.get(surfaces)!) {
      if (
        Math.max(a.x, b.x) < r.x ||
        Math.min(a.x, b.x) > r.x + r.w ||
        Math.max(a.y, b.y) < r.y ||
        Math.min(a.y, b.y) > r.y + r.h
      )
        continue;
      for (let i = 0; i < points.length; i++) {
        const p = points[i],
          q = points[(i + 1) % points.length],
          ex = q.x - p.x,
          ey = q.y - p.y;
        const determinant = dx * ey - dy * ex;
        if (Math.abs(determinant) < 1e-10) continue;
        const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / determinant;
        const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / determinant;
        if (t > 1e-9 && t < 1 - 1e-9 && u >= 0 && u <= 1) cuts.push(t);
      }
    }
    cuts.sort((x, y) => x - y);
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] - cuts[i - 1] < 1e-9) continue;
      const t = (cuts[i] + cuts[i - 1]) / 2;
      if (!onSurface({ x: a.x + dx * t, y: a.y + dy * t }, surfaces))
        return false;
    }
  }
  return true;
}
/** Routes and their connecting segments use the same foot collision as keyboard movement. */
export function findPath(
  start: Point,
  goal: Point,
  geometry: Geometry,
  hazards: Hazard[] = [],
): Point[] | null {
  if (
    !canStand(
      start,
      geometry.walls,
      geometry.bounds,
      geometry.floor,
      geometry.surfaces,
    )
  )
    return null;
  const step = 8,
    cols = Math.ceil((geometry.bounds.x + geometry.bounds.w) / step) + 1;
  const rows = Math.ceil((geometry.bounds.y + geometry.bounds.h) / step) + 1;
  const center = (id: number): Point => ({
    x: (id % cols) * step + 4,
    y: Math.floor(id / cols) * step + 4,
  });
  const valid = (point: Point) =>
    canStand(
      point,
      geometry.walls,
      geometry.bounds,
      geometry.floor,
      geometry.surfaces,
    ) && !touchingHazard(point, hazards, PLAYER_RADIUS + 2);
  const goalIsClear = valid(goal);
  if (goalIsClear && canTravelBetween(start, goal, geometry, hazards))
    return [{ ...goal }];
  let anchor = -1,
    nearest = Infinity;
  const sx = Math.floor(start.x / step),
    sy = Math.floor(start.y / step);
  for (let y = sy - 3; y <= sy + 3; y++)
    for (let x = sx - 3; x <= sx + 3; x++) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const id = y * cols + x,
        p = center(id),
        distance = Math.hypot(p.x - start.x, p.y - start.y);
      if (
        distance < nearest &&
        valid(p) &&
        canTravelBetween(start, p, geometry, hazards)
      ) {
        anchor = id;
        nearest = distance;
      }
    }
  if (anchor === -1) return null;
  const previous = new Int32Array(cols * rows).fill(-2),
    queue = [anchor];
  previous[anchor] = -1;
  let best = anchor,
    bestDistance = Infinity;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i],
      p = center(id),
      distance = Math.hypot(p.x - goal.x, p.y - goal.y);
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
    if (
      goalIsClear &&
      distance <= step * Math.SQRT2 &&
      canTravelBetween(p, goal, geometry, hazards)
    ) {
      best = id;
      bestDistance = distance;
      break;
    }
    const x = id % cols,
      y = Math.floor(id / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const next = ny * cols + nx;
      if (previous[next] !== -2) continue;
      const pNext = center(next);
      if (valid(pNext) && canTravelBetween(p, pNext, geometry, hazards)) {
        previous[next] = id;
        queue.push(next);
      }
    }
  }
  if (bestDistance > 36) return null;
  const path: Point[] = [];
  for (let id = best; id !== -1; id = previous[id]) path.unshift(center(id));
  if (
    valid(goal) &&
    canTravelBetween(path[path.length - 1], goal, geometry, hazards)
  )
    path.push({ ...goal });
  return path;
}
/** Spend the movement budget without snapping through blocked grid corners. */
export function advancePath(
  start: Point,
  path: Point[],
  delta: number,
  geometry: Geometry,
) {
  const remaining = [...path];
  let point = { ...start },
    budget = PLAYER_SPEED * clampedDelta(delta);
  while (remaining.length && budget > 1e-6) {
    const target = remaining[0],
      distance = Math.hypot(target.x - point.x, target.y - point.y);
    if (distance < 1e-6) {
      remaining.shift();
      continue;
    }
    const length = Math.min(budget, distance);
    const next = {
      x: point.x + ((target.x - point.x) / distance) * length,
      y: point.y + ((target.y - point.y) / distance) * length,
    };
    if (!canTravelBetween(point, next, geometry))
      return { point, remaining: [], blocked: true };
    point = next;
    budget -= length;
    if (length >= distance - 1e-6) remaining.shift();
  }
  return { point, remaining, blocked: false };
}
export function fitSprite(width: number, height: number, maxEdge = 48) {
  const scale = maxEdge / Math.max(width, height);
  return { width: width * scale, height: height * scale };
}
export function isCakeCut(start: Point, end: Point): boolean {
  return (
    Math.abs(start.x - 0.5) < 0.2 &&
    start.y < 0.36 &&
    Math.abs(end.x - 0.5) < 0.23 &&
    end.y > 0.77 &&
    end.y - start.y > 0.45
  );
}
