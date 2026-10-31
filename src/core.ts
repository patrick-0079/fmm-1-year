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
export interface Progress {
  visited: string[];
  completed: string[];
  sound: boolean;
}
export const SAVE_KEY = "nemu-anniversary-v1";
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

export function canStand(p: Point, walls: Rect[], bounds: Rect): boolean {
  const r = 4;
  if (
    p.x - r < bounds.x ||
    p.x + r > bounds.x + bounds.w ||
    p.y - r < bounds.y ||
    p.y + r > bounds.y + bounds.h
  )
    return false;
  return !walls.some(
    (o) =>
      p.x + r > o.x &&
      p.x - r < o.x + o.w &&
      p.y + r > o.y &&
      p.y - r < o.y + o.h,
  );
}

export function movePlayer(
  p: Point,
  input: Point,
  delta: number,
  walls: Rect[],
  bounds: Rect,
): Point {
  const length = Math.hypot(input.x, input.y);
  if (!length) return { ...p };
  const distance = 65 * Math.min(Math.max(delta, 0), 0.05);
  const step = {
    x: (input.x / length) * distance,
    y: (input.y / length) * distance,
  };
  const next = { ...p };
  if (canStand({ x: next.x + step.x, y: next.y }, walls, bounds))
    next.x += step.x;
  if (canStand({ x: next.x, y: next.y + step.y }, walls, bounds))
    next.y += step.y;
  return next;
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
