import test from "node:test";
import assert from "node:assert/strict";
import {
  canStand,
  canTravelBetween,
  findPath,
  advancePath,
  touchingHazard,
  fitSprite,
} from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { readFileSync } from "node:fs";

for (const [name, scene] of Object.entries(scenes)) {
  test(`${name}: every interaction approach and map spawn is on clear ground`, () => {
    for (const spot of scene.spots)
      assert.ok(
        Math.hypot(spot.x - spot.approach.x, spot.y - spot.approach.y) <
          (spot.radius ?? 48),
        `${spot.id} approach must actually trigger its interaction`,
      );
    for (const [label, point] of [
      ["spawn", scene.spawn],
      ...scene.spots.map((p) => [p.id, p.approach] as const),
    ] as const) {
      assert.equal(
        canStand(point, scene.walls, scene.bounds, scene.floor),
        true,
        `${label} is blocked`,
      );
      assert.equal(
        touchingHazard(point, scene.hazards, 10),
        undefined,
        `${label} is too close to a trap`,
      );
    }
    for (const trap of scene.hazards)
      assert.equal(
        canStand(trap, scene.walls, scene.bounds, scene.floor),
        true,
        `${trap.id} must be walkable to trigger`,
      );
  });
  test(`${name}: all activities are reachable from spawns and rest exits without corner cuts or traps`, () => {
    for (const checkpoint of [
      { id: "spawn", ...scene.spawn },
      ...scene.spots
        .filter((s) => s.id === "rest" || s.id === "bed")
        .map((s) => ({ id: s.id, ...s.approach })),
    ])
      for (const spot of scene.spots) {
        const path = findPath(checkpoint, spot.approach, scene, scene.hazards);
        assert.ok(path, `no route from ${checkpoint.id} to ${spot.id}`);
        assert.deepEqual(
          path.at(-1),
          spot.approach,
          `${spot.id} route did not reach the interaction point`,
        );
        let previous = checkpoint;
        for (const point of path) {
          assert.equal(
            canTravelBetween(previous, point, scene, scene.hazards),
            true,
            `${spot.id} crosses a solid or trap`,
          );
          previous = { ...checkpoint, ...point };
        }
        let position = { x: checkpoint.x, y: checkpoint.y },
          remaining = path;
        for (let i = 0; i < 2500 && remaining.length; i++) {
          const next = advancePath(position, remaining, 0.05, scene);
          assert.equal(
            next.blocked,
            false,
            `${spot.id} gets stuck while moving`,
          );
          position = next.point;
          remaining = next.remaining;
        }
        assert.equal(remaining.length, 0, `${spot.id} never arrives`);
        assert.ok(
          Math.hypot(
            position.x - spot.approach.x,
            position.y - spot.approach.y,
          ) < 0.01,
        );
      }
  });
}
test("stairs and courtyard no longer collide with the oversized house box", () => {
  const s = scenes.garden;
  for (const p of [
    { x: 450, y: 120 },
    { x: 450, y: 145 },
    { x: 450, y: 160 },
    { x: 310, y: 150 },
    { x: 560, y: 160 },
  ])
    assert.equal(canStand(p, s.walls, s.bounds, s.floor), true);
  for (const p of [
    { x: 380, y: 130 },
    { x: 510, y: 130 },
    { x: 450, y: 90 },
    { x: 845, y: 250 },
  ])
    assert.equal(canStand(p, s.walls, s.bounds, s.floor), false);
});

test("courtyard fences block feet while the central crossing stays open", () => {
  const s = scenes.garden;
  for (const p of [
    { x: 334, y: 323 },
    { x: 337, y: 381 },
    { x: 564, y: 323 },
    { x: 560, y: 382 },
    { x: 558, y: 358 },
  ])
    assert.equal(canStand(p, s.walls, s.bounds, s.floor), false);
  for (const p of [
    { x: 450, y: 350 },
    { x: 450, y: 390 },
  ])
    assert.equal(canStand(p, s.walls, s.bounds, s.floor), true);
});
test("round-table corners and bed-side corridor are clear, furniture bases are solid", () => {
  const s = scenes.room;
  for (const p of [
    { x: 264, y: 196 },
    { x: 555, y: 151 },
    { x: 486, y: 196 },
  ])
    assert.equal(canStand(p, s.walls, s.bounds), true);
  for (const p of [
    { x: 300, y: 224 },
    { x: 470, y: 140 },
    { x: 91, y: 210 },
    { x: 206, y: 95 },
  ])
    assert.equal(canStand(p, s.walls, s.bounds), false);
});
test("malformed route points cannot snap a player through a wall", () => {
  const geometry = {
    bounds: { x: 0, y: 0, w: 100, h: 100 },
    walls: [{ x: 50, y: 0, w: 2, h: 100 }],
  };
  const result = advancePath(
    { x: 44, y: 50 },
    [{ x: 54, y: 50 }],
    0.05,
    geometry,
  );
  assert.equal(result.blocked, true);
  assert.deepEqual(result.point, { x: 44, y: 50 });
});
test("real sprite frames render at their original aspect ratio", () => {
  const png = readFileSync(
    new URL("../src/assets/nemu-sprites.png", import.meta.url),
  );
  const width = png.readUInt32BE(16) / 3,
    height = png.readUInt32BE(20) / 4;
  assert.equal(width, height, "the 3 by 4 sheet has square cells");
  const output = fitSprite(width, height);
  assert.equal(output.width, 48);
  assert.equal(output.height, 48);
});
