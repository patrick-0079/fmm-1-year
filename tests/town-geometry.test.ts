import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, movePlayer } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { townCanopies, festivalProps } from "../src/town-scenery.ts";

const square = (left: number, right: number) => [
  { x: left, y: 0 },
  { x: right, y: 0 },
  { x: right, y: 100 },
  { x: left, y: 100 },
];

test("adjoining paved surfaces have no artificial seam, tiny planted gaps cannot be crossed", () => {
  const g = {
    bounds: { x: 0, y: 0, w: 100, h: 100 },
    walls: [],
    surfaces: [square(0, 50), square(50, 100)],
  };
  assert.equal(
    canStand({ x: 50, y: 50 }, g.walls, g.bounds, undefined, g.surfaces),
    true,
  );
  assert.equal(canTravelBetween({ x: 40, y: 50 }, { x: 60, y: 50 }, g), true);
  const gap = { ...g, surfaces: [square(0, 49.1), square(49.3, 100)] };
  assert.equal(
    canTravelBetween({ x: 40, y: 50 }, { x: 60, y: 50 }, gap),
    false,
  );
  const p = movePlayer(
    { x: 43.8, y: 50 },
    { x: 1, y: 0 },
    0.05,
    gap.walls,
    gap.bounds,
    undefined,
    gap.surfaces,
  );
  assert.ok(p.x < 44, "keyboard movement must also stop at the narrow gap");
});

test("town planted islands, the reported workshop roof and celebration furniture block feet", () => {
  const s = scenes.town;
  for (const [x, y] of [
    [1175, 227],
    [360, 380],
    [680, 600],
    [1080, 438],
    [1360, 625],
    [759, 477],
  ])
    assert.equal(
      canStand({ x, y }, s.walls, s.bounds, s.floor, s.surfaces),
      false,
      `${x},${y} is scenery`,
    );
  for (const [x, y] of [
    [450, 960],
    [488, 357],
    [789, 319],
    [740, 550],
    [866, 811],
    [1330, 540],
  ])
    assert.equal(
      canStand({ x, y }, s.walls, s.bounds, s.floor, s.surfaces),
      true,
      `${x},${y} is paving`,
    );
});

test("tree occlusion silhouettes are separate from the roots, and anniversary props span multiple streets", () => {
  assert.ok(townCanopies.length >= 10);
  for (const t of townCanopies) {
    assert.ok(t.points.length >= 5);
    assert.ok(
      Math.max(...t.points.map((p) => p.y)) < t.y,
      "canopy sorts using its root, not its top edge",
    );
    assert.ok(
      t.points.every((p) => p.x >= 0 && p.x <= 1536 && p.y >= 0 && p.y <= 1024),
    );
  }
  assert.deepEqual(
    new Set(festivalProps.map((p) => p.kind)),
    new Set(["arch", "cake", "balloons", "garland"]),
  );
});
