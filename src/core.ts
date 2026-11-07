import {
  canStand,
  canTravelBetween,
  PLAYER_RADIUS,
  touchingHazard,
} from "./collision.ts";
import { rainbowIds } from "./rainbow-flowers.ts";
import { readEchoMemory, type EchoMemory } from "./echoes.ts";
import { readAstrolabe, type AstrolabeState } from "./astrolabe.ts";
import { readFoxMemory, type FoxMemory } from "./fox-memory.ts";
import { readResidentStory, type ResidentStory } from "./resident-story.ts";
import { producers } from "./content.ts";
import { ARCADES } from "./town-data.ts";
import type { GameId } from "./arcade-engines.ts";

export {
  canStand,
  canTravelBetween,
  crossedHazard,
  obstacleContainsFoot,
  polygonContains,
  PLAYER_RADIUS,
  touchingHazard,
} from "./collision.ts";

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
  roomFox: FoxMemory;
  residents: ResidentStory;
  decoratorMet: boolean;
  rabbitIntroduced: boolean;
  echoes: EchoMemory;
  astrolabe: AstrolabeState;
  rainbowFlowers: string[];
  creditStars: string[];
  arcadeBests: Partial<Record<GameId, number>>;
}
export const SAVE_KEY = "nemu-anniversary-v1";
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
    roomFox: readFoxMemory(),
    residents: readResidentStory(),
    decoratorMet: false,
    rabbitIntroduced: false,
    echoes: readEchoMemory(),
    astrolabe: readAstrolabe(),
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
      roomFox: readFoxMemory(p.roomFox),
      residents: readResidentStory(p.residents),
      decoratorMet: p.decoratorMet === true,
      rabbitIntroduced: p.decoratorMet === true && p.rabbitIntroduced === true,
      echoes: readEchoMemory(p.echoes),
      astrolabe: readAstrolabe(p.astrolabe),
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
  const geometry = { walls, bounds, floor, surfaces };
  let next = { ...point };
  for (let i = 0; i < steps; i++) {
    const target = { x: next.x + dx, y: next.y + dy };
    if (canTravelBetween(next, target, geometry)) {
      next = target;
      continue;
    }
    if (!dx || !dy) break;
    // At a corner, keep a free axis for sliding. In a narrow diagonal
    // passage the combined motion above may be the only legal one.
    const horizontal = { x: target.x, y: next.y };
    if (canTravelBetween(next, horizontal, geometry)) next = horizontal;
    const vertical = { x: next.x, y: target.y };
    if (canTravelBetween(next, vertical, geometry)) next = vertical;
  }
  return next;
}
const gridDirections = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1],
] as const;
const localStep = 2, localRadius = 16;

// A ten-pixel foot can fit a lane whose centre misses the eight-pixel lattice.
// Search just the endpoint's neighbourhood at finer resolution when necessary.
function connectOffGrid(
  endpoint: Point,
  join: (p: Point) => number,
  valid: (p: Point) => boolean,
  travel: (a: Point, b: Point) => boolean,
) {
  const width = localRadius * 2 + 1;
  const at = (id: number) => ({
    x: endpoint.x + (id % width - localRadius) * localStep,
    y: endpoint.y + (Math.floor(id / width) - localRadius) * localStep,
  });
  const root = localRadius * width + localRadius;
  const previous = new Int16Array(width * width).fill(-2);
  previous[root] = -1;
  const queue = [root];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i], point = at(id), anchor = join(point);
    if (anchor >= 0) {
      const route: Point[] = [];
      for (let j = id; j !== -1; j = previous[j]) route.push(at(j));
      return { anchor, route };
    }
    for (const [dx, dy] of gridDirections) {
      const x = id % width + dx, y = Math.floor(id / width) + dy;
      if (x < 0 || x >= width || y < 0 || y >= width) continue;
      const next = y * width + x;
      if (previous[next] !== -2) continue;
      const target = at(next);
      if (!valid(target)) previous[next] = -3;
      else if (travel(point, target)) {
        previous[next] = id;
        queue.push(next);
      }
    }
  }
  return null;
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
  const travel = (a: Point, b: Point) => canTravelBetween(a, b, geometry, hazards);
  const goalIsClear = valid(goal);
  if (goalIsClear && travel(start, goal)) return [{ ...goal }];
  const directGoal = cols * rows;
  const link = (endpoint: Point, reachable: (id: number) => boolean, shortcut?: Point) =>
    connectOffGrid(endpoint, p => {
      if (shortcut && Math.hypot(p.x - shortcut.x, p.y - shortcut.y) <= step * 2 &&
          travel(p, shortcut)) return directGoal;
      const left = Math.floor((p.x - step / 2) / step);
      const top = Math.floor((p.y - step / 2) / step);
      for (let y = top; y <= top + 1; y++)
        for (let x = left; x <= left + 1; x++) {
          if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
          const id = y * cols + x;
          if (reachable(id) && travel(p, center(id))) return id;
        }
      return -1;
    }, valid, travel);
  const previous = new Int32Array(cols * rows).fill(-2),
    walkable = new Int8Array(cols * rows),
    queue: number[] = [];
  const sx = Math.floor(start.x / step),
    sy = Math.floor(start.y / step);
  for (let y = sy - 3; y <= sy + 3; y++)
    for (let x = sx - 3; x <= sx + 3; x++) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const id = y * cols + x;
      if (travel(start, center(id))) {
        previous[id] = -1;
        queue.push(id);
      }
    }
  let prefix: Point[] = [];
  if (!queue.length) {
    const initial = goalIsClear && link(start, () => true, goal);
    if (!initial) return null;
    prefix = initial.route.reverse().slice(1);
    if (initial.anchor === directGoal) return [...prefix, { ...goal }];
    previous[initial.anchor] = -1;
    queue.push(initial.anchor);
  } else {
    const fromStart = (id: number) => {
      const p = center(id);
      return (p.x - start.x) ** 2 + (p.y - start.y) ** 2;
    };
    queue.sort((a,b) => fromStart(a) - fromStart(b));
  }
  let best = queue[0],
    bestDistance = Infinity;
  let suffix: Point[] = [];
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
      travel(p, goal)
    ) {
      best = id;
      bestDistance = distance;
      suffix = [{ ...goal }];
      break;
    }
    const x = id % cols,
      y = Math.floor(id / cols);
    for (const [dx, dy] of gridDirections) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const next = ny * cols + nx;
      if (previous[next] !== -2 || walkable[next] < 0) continue;
      const pNext = center(next);
      if (!walkable[next]) walkable[next] = valid(pNext) ? 1 : -1;
      if (walkable[next] > 0 && travel(p, pNext)) {
        previous[next] = id;
        queue.push(next);
      }
    }
  }
  if (goalIsClear && !suffix.length && bestDistance <= 36 && travel(center(best), goal)) {
    suffix = [{ ...goal }];
  }
  if (goalIsClear && !suffix.length &&
      bestDistance <= (localRadius * localStep + step) * Math.SQRT2) {
    const last = link(goal, id => previous[id] !== -2);
    if (last) {
      best = last.anchor;
      suffix = last.route;
    }
  }
  if (!suffix.length && bestDistance > 36) return null;
  const path: Point[] = [];
  for (let id = best; id !== -1; id = previous[id]) path.unshift(center(id));
  return [...prefix, ...path, ...suffix];
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
