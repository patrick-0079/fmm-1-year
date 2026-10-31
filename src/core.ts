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
}
export const SAVE_KEY = "nemu-anniversary-v1";
export const PLAYER_RADIUS = 5;
export const PLAYER_SPEED = 78;
export const GAME_IDS = ["cake", "gifts", "balloons", "fireworks"] as const;
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
  const clean: Progress = { visited: [], completed: [], sound: false };
  if (!raw) return clean;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return clean;
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
): Point {
  const length = Math.hypot(input.x, input.y);
  if (!length) return { ...point };
  const distance = PLAYER_SPEED * clampedDelta(delta),
    steps = Math.max(1, Math.ceil(distance / 2));
  const dx = ((input.x / length) * distance) / steps,
    dy = ((input.y / length) * distance) / steps;
  const next = { ...point };
  for (let i = 0; i < steps; i++) {
    if (canStand({ x: next.x + dx, y: next.y }, walls, bounds, floor))
      next.x += dx;
    if (canStand({ x: next.x, y: next.y + dy }, walls, bounds, floor))
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
/** Routes and their connecting segments use the same foot collision as keyboard movement. */
export function findPath(
  start: Point,
  goal: Point,
  geometry: Geometry,
  hazards: Hazard[] = [],
): Point[] | null {
  if (!canStand(start, geometry.walls, geometry.bounds, geometry.floor))
    return null;
  const step = 8,
    cols = Math.ceil((geometry.bounds.x + geometry.bounds.w) / step) + 1;
  const rows = Math.ceil((geometry.bounds.y + geometry.bounds.h) / step) + 1;
  const center = (id: number): Point => ({
    x: (id % cols) * step + 4,
    y: Math.floor(id / cols) * step + 4,
  });
  const valid = (point: Point) =>
    canStand(point, geometry.walls, geometry.bounds, geometry.floor) &&
    !touchingHazard(point, hazards, PLAYER_RADIUS + 2);
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
    if (distance < 0.5) break;
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
