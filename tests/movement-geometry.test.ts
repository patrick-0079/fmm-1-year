import test from "node:test";
import assert from "node:assert/strict";
import {
  advancePath,
  canStand,
  canTravelBetween,
  crossedHazard,
  findPath,
  movePlayer,
  touchingHazard,
  type Geometry,
  type Hazard,
} from "../src/core.ts";
import { scenes } from "../src/maps.ts";

const bounds = { x: 0, y: 0, w: 140, h: 100 };
const points = (pairs: [number, number][]) => pairs.map(([x, y]) => ({ x, y }));

test("a click reaches either end of a narrow elbow that the eight-pixel grid misses", () => {
  const rect = (x: number, y: number, w: number, h: number) =>
    points([
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ]);
  const elbow = [rect(45, 42.25, 40.75, 11.5), rect(74.25, 42.25, 11.5, 38)];
  const chamber = rect(0, 0, 65, 82);
  const end = { x: 80, y: 72 };
  for (const [start, surfaces] of [
    [{ x: 12, y: 20 }, [chamber, ...elbow]],
    [{ x: 56, y: 48 }, elbow],
  ] as const) {
    const map = { bounds, walls: [], surfaces: [...surfaces] };
    for (const [from, to] of [
      [start, end],
      [end, start],
    ]) {
      assert.equal(canTravelBetween(from, to, map), false);
      const path = findPath(from, to, map);
      assert.ok(path);
      assert.deepEqual(path.at(-1), to);
      let previous = from;
      for (const point of path) {
        assert.ok(canTravelBetween(previous, point, map));
        previous = point;
      }
    }
  }
  const sealed = {
    bounds,
    surfaces: [chamber, ...elbow],
    walls: [{ x: 69, y: 42, w: 2, h: 12 }],
  };
  assert.notDeepEqual(findPath({ x: 12, y: 20 }, end, sealed)?.at(-1), end);
});

test("a single courtyard click reaches the same ground as the two-click turn", () => {
  const scene = scenes.garden,
    via = { x: 637, y: 287 },
    goal = { x: 620, y: 291 };
  assert.deepEqual(
    findPath(scene.spawn, via, scene, scene.hazards)?.at(-1),
    via,
  );
  assert.ok(canTravelBetween(via, goal, scene, scene.hazards));
  assert.deepEqual(
    findPath(scene.spawn, goal, scene, scene.hazards)?.at(-1),
    goal,
  );
});

test("directional controls and click routes can follow the same narrow diagonal passage", () => {
  const geometry: Geometry = {
    bounds,
    walls: [],
    surfaces: [
      points([
        [0, -7.25],
        [69, 61.75],
        [69, 76.25],
        [0, 7.25],
      ]),
      points([
        [60, 68.75],
        [136, -7.25],
        [136, 7.25],
        [60, 83.25],
      ]),
      points([
        [52, 50],
        [84, 50],
        [84, 83],
        [52, 83],
      ]),
    ],
  };
  const start = { x: 12, y: 12 },
    end = { x: 124, y: 12 },
    elbow = { x: 68, y: 68 };
  assert.equal(canTravelBetween(start, elbow, geometry), true);
  assert.equal(canTravelBetween(elbow, end, geometry), true);
  assert.equal(canTravelBetween(start, end, geometry), false);
  const directional = movePlayer(
    start,
    { x: 1, y: 1 },
    0.05,
    [],
    bounds,
    undefined,
    geometry.surfaces,
  );
  const clicked = advancePath(start, [elbow], 0.05, geometry);
  assert.ok(directional.x > start.x + 2);
  assert.ok(
    Math.hypot(
      directional.x - clicked.point.x,
      directional.y - clicked.point.y,
    ) < 1e-8,
  );
  const path = findPath(start, end, geometry);
  assert.ok(path);
  assert.deepEqual(path.at(-1), end);
  let previous = start;
  for (const step of path) {
    assert.ok(canTravelBetween(previous, step, geometry));
    previous = step;
  }
});

test("a foot cannot graze through an obstacle corner between two legal endpoints", () => {
  const q = Math.SQRT1_2,
    middle = { x: 21 - 4.98 * q, y: 21 - 4.98 * q };
  const a = { x: middle.x - 0.9 * q, y: middle.y + 0.9 * q };
  const b = { x: middle.x + 0.9 * q, y: middle.y - 0.9 * q };
  for (const wall of [
    { x: 21, y: 21, w: 3, h: 3 },
    {
      points: points([
        [21, 21],
        [24, 21],
        [24, 24],
        [21, 24],
      ]),
    },
  ]) {
    const walls = [wall],
      geometry = { walls, bounds };
    assert.ok(canStand(a, walls, bounds));
    assert.ok(canStand(b, walls, bounds));
    assert.equal(canStand(middle, walls, bounds), false);
    assert.equal(canTravelBetween(a, b, geometry), false);
    assert.equal(canTravelBetween(b, a, geometry), false);
    assert.equal(advancePath(a, [b], 0.05, geometry).blocked, true);
  }
});

test("the full circular foot fits within the union, including subpixel gaps and shared edges", () => {
  const upper = points([
    [0, 0],
    [100, 0],
    [100, 52],
    [0, 52],
  ]);
  const below = (y: number) =>
    points([
      [0, y],
      [100, y],
      [100, 100],
      [0, 100],
    ]);
  const a = { x: 30, y: 50 },
    b = { x: 70, y: 50 };
  for (const y of [52, 51.7]) {
    const surfaces = [upper, below(y)];
    assert.ok(canStand(a, [], bounds, undefined, surfaces));
    assert.ok(canTravelBetween(a, b, { walls: [], bounds, surfaces }));
  }
  const surfaces = [upper, below(52.3)];
  assert.equal(canStand(a, [], bounds, undefined, surfaces), false);
  assert.equal(canTravelBetween(a, b, { walls: [], bounds, surfaces }), false);
});

test("floating traps detect a foot brushing their rim between frames, with a wider buffer for pathfinding", () => {
  const trap: Hazard = {
    id: "roots",
    title: "roots",
    kind: "mist",
    x: 40,
    y: 40,
    radius: 8,
  };
  const crossing = (clearance: number) => {
    const y = trap.y - trap.radius - clearance + 0.01;
    return [
      { x: 39.1, y },
      { x: 40.9, y },
    ] as const;
  };
  const [start, end] = crossing(5);
  assert.equal(crossedHazard(start, start, [trap]), undefined);
  assert.equal(crossedHazard(end, end, [trap]), undefined);
  assert.equal(crossedHazard(start, end, [trap]), trap);
  const [a, b] = crossing(7);
  assert.equal(crossedHazard(a, b, [trap]), undefined);
  assert.equal(canTravelBetween(a, b, { bounds, walls: [] }, [trap]), false);
});

test("ground traps touch at their visible sides and leave the ground behind them clear", () => {
  const geometry = { bounds: scenes.challenge.bounds, walls: [] };
  for (const trap of scenes.challenge.hazards.filter(
    (h) => h.kind === "stone" || h.kind === "ribbon",
  )) {
    const at = (dx: number, dy: number) => ({ x: trap.x + dx, y: trap.y + dy });
    assert.equal(touchingHazard(at(0, 0), [trap]), trap);
    assert.equal(touchingHazard(at(24, 0), [trap]), trap);
    assert.equal(touchingHazard(at(0, -16), [trap]), undefined);
    assert.equal(touchingHazard(at(0, 14), [trap]), undefined);
    assert.equal(crossedHazard(at(24, -18), at(24, 18), [trap]), trap);
    assert.equal(
      canTravelBetween(at(24, -18), at(24, 18), geometry, [trap]),
      false,
    );
    assert.equal(
      canTravelBetween(at(-30, -16), at(30, -16), geometry, [trap]),
      true,
    );
  }
});
