import type { Geometry, Hazard, Obstacle, Point, Rect } from "./core.ts";
import { trapFootprint } from "./trap-art.ts";

export const PLAYER_RADIUS = 5;
const footClearance = PLAYER_RADIUS - 1e-6;

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

function distanceSq(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return (p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2;
}

interface Extent {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface Edge extends Extent {
  a: Point;
  b: Point;
}
interface Polygon extends Extent {
  points: Point[];
  edges: Edge[];
}

function edge(a: Point, b: Point): Edge {
  return {
    a,
    b,
    left: Math.min(a.x, b.x),
    right: Math.max(a.x, b.x),
    top: Math.min(a.y, b.y),
    bottom: Math.max(a.y, b.y),
  };
}

function overlaps(a: Extent, b: Extent, padding = 0) {
  return (
    a.right + padding >= b.left &&
    a.left - padding <= b.right &&
    a.bottom + padding >= b.top &&
    a.top - padding <= b.bottom
  );
}

const polygons = new WeakMap<Point[], Polygon>();
function polygon(points: Point[]): Polygon {
  const cached = polygons.get(points);
  if (cached) return cached;
  const edges = points.map((p, i) => edge(p, points[(i + 1) % points.length]));
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const result = {
    points,
    edges,
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
  polygons.set(points, result);
  return result;
}

function cross(a: Point, b: Point, p: Point) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

/** The shortest distance between two segments is at an endpoint unless they cross. */
function hitsEdge(move: Edge, bank: Edge, clearance = footClearance): boolean {
  if (!overlaps(move, bank, clearance)) return false;
  const squared = clearance * clearance;
  const { a, b } = move,
    { a: p, b: q } = bank;
  if (distanceSq(a, p, q) < squared) return true;
  if (a.x === b.x && a.y === b.y) return false;
  return (
    distanceSq(b, p, q) < squared ||
    distanceSq(p, a, b) < squared ||
    distanceSq(q, a, b) < squared ||
    (cross(a, b, p) * cross(a, b, q) < 0 && cross(p, q, a) * cross(p, q, b) < 0)
  );
}

function containsSurface(point: Point, surfaces: Polygon[]) {
  return surfaces.some(
    (p) =>
      point.x >= p.left &&
      point.x <= p.right &&
      point.y >= p.top &&
      point.y <= p.bottom &&
      polygonContains(point, p.points),
  );
}

/** Cut an edge wherever the polygon covering either side can change. */
function addCuts(cuts: number[], segment: Edge, other: Edge) {
  if (!overlaps(segment, other)) return;
  const { a, b } = segment,
    { a: p, b: q } = other;
  const dx = b.x - a.x,
    dy = b.y - a.y,
    ex = q.x - p.x,
    ey = q.y - p.y;
  const det = dx * ey - dy * ex;
  if (Math.abs(det) < 1e-10) {
    if (Math.abs(cross(a, b, p)) > 1e-9) return;
    const lengthSq = dx * dx + dy * dy;
    for (const point of [p, q]) {
      const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
      if (t > 0 && t < 1) cuts.push(t);
    }
    return;
  }
  const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / det;
  const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / det;
  if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
}

// Authored walkable polygons can overlap or share edges. Only the exposed
// outline of their union can stop a foot, including the shores of interior holes.
interface SurfaceUnion {
  shapes: Polygon[];
  banks: Edge[];
}
const surfaceUnions = new WeakMap<Point[][], SurfaceUnion>();
function surfaceUnion(surfaces: Point[][]): SurfaceUnion {
  const cached = surfaceUnions.get(surfaces);
  if (cached) return cached;
  const shapes = surfaces.map(polygon),
    edges = shapes.flatMap((p) => p.edges),
    banks: Edge[] = [];
  for (const segment of edges) {
    const { a, b } = segment;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      length = Math.hypot(dx, dy);
    if (!length) continue;
    const cuts = [0, 1];
    for (const other of edges)
      if (other !== segment) addCuts(cuts, segment, other);
    cuts.sort((u, v) => u - v);
    const at = (t: number) => ({ x: a.x + t * dx, y: a.y + t * dy });
    const nx = (-dy / length) * 1e-7,
      ny = (dx / length) * 1e-7;
    for (let i = 1; i < cuts.length; i++) {
      const lo = cuts[i - 1],
        hi = cuts[i];
      if (hi - lo < 1e-10) continue;
      const mid = at((lo + hi) / 2);
      if (
        containsSurface({ x: mid.x + nx, y: mid.y + ny }, shapes) !==
        containsSurface({ x: mid.x - nx, y: mid.y - ny }, shapes)
      )
        banks.push(edge(at(lo), at(hi)));
    }
  }
  const result = { shapes, banks };
  surfaceUnions.set(surfaces, result);
  return result;
}

const rectangles = new WeakMap<Rect, Polygon>();
export function surfaceOutline(
  surfaces: Point[][],
): ReadonlyArray<{ a: Point; b: Point }> {
  return surfaceUnion(surfaces).banks;
}

function wallPolygon(wall: Obstacle): Polygon {
  if ("points" in wall) return polygon(wall.points);
  const cached = rectangles.get(wall);
  if (cached) return cached;
  const { x, y, w, h } = wall;
  const shape = polygon([
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]);
  rectangles.set(wall, shape);
  return shape;
}

function hitsWall(move: Edge, wall: Obstacle): boolean {
  const p = wallPolygon(wall);
  return (
    overlaps(move, p, footClearance) &&
    (polygonContains(move.a, p.points) ||
      p.edges.some((e) => hitsEdge(move, e)))
  );
}

export function obstacleContainsFoot(point: Point, wall: Obstacle) {
  return hitsWall(edge(point, point), wall);
}

export function crossedHazard(
  start: Point,
  end: Point,
  hazards: Hazard[],
  padding = PLAYER_RADIUS,
): Hazard | undefined {
  if (!hazards.length) return;
  const move = edge(start, end);
  return hazards.find((h) => {
    const points = trapFootprint(h);
    if (!points) return distanceSq(h, start, end) < (h.radius + padding) ** 2;
    const shape = polygon(points);
    return (
      overlaps(move, shape, padding) &&
      (polygonContains(start, points) ||
        shape.edges.some((e) => hitsEdge(move, e, padding)))
    );
  });
}

export function touchingHazard(
  point: Point,
  hazards: Hazard[],
  padding = PLAYER_RADIUS,
) {
  return crossedHazard(point, point, hazards, padding);
}

/** Check the entire capsule swept by the player's circular foot. */
export function canTravelBetween(
  start: Point,
  end: Point,
  geometry: Geometry,
  hazards: Hazard[] = [],
): boolean {
  const move = edge(start, end),
    bounds = geometry.bounds;
  if (
    move.left - PLAYER_RADIUS < bounds.x ||
    move.right + PLAYER_RADIUS > bounds.x + bounds.w ||
    move.top - PLAYER_RADIUS < bounds.y ||
    move.bottom + PLAYER_RADIUS > bounds.y + bounds.h
  )
    return false;
  if (geometry.floor) {
    const floor = polygon(geometry.floor);
    if (
      !polygonContains(start, floor.points) ||
      floor.edges.some((e) => hitsEdge(move, e))
    )
      return false;
  }
  if (geometry.surfaces) {
    const union = surfaceUnion(geometry.surfaces);
    if (
      !containsSurface(start, union.shapes) ||
      union.banks.some((e) => hitsEdge(move, e))
    )
      return false;
  }
  return (
    !geometry.walls.some((w) => hitsWall(move, w)) &&
    !crossedHazard(start, end, hazards, PLAYER_RADIUS + 2)
  );
}

export function canStand(
  point: Point,
  walls: Obstacle[],
  bounds: Rect,
  floor?: Point[],
  surfaces?: Point[][],
): boolean {
  return canTravelBetween(point, point, { walls, bounds, floor, surfaces });
}
