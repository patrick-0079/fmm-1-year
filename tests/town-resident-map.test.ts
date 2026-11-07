import test from "node:test";
import assert from "node:assert/strict";
import { canStand, findPath } from "../src/core.ts";
import { surfaceOutline } from "../src/collision.ts";
import { scenes } from "../src/maps.ts";
import { TownResidentMap } from "../src/town-resident-map.ts";

test("the moving cat takes its hitbox and interaction anchor with it and gives way when returning", () => {
  const street = new TownResidentMap(scenes.town);
  const base = scenes.town.spots.find((s) => s.id === "npc-cat")!;
  const live = street.anchor("cat");
  const moved = { x: base.x + 26, y: base.y - 12 };
  const floor = (point: { x: number; y: number }) => {
    const { walls, bounds, floor, surfaces } = street.scene;
    return canStand(point, walls, bounds, floor, surfaces);
  };
  street.update(base.approach, "cat", moved);
  assert.equal(floor(base), true);
  assert.equal(floor(moved), false);
  assert.equal(floor(live.approach), true);
  assert.deepEqual([live.x, live.y], [moved.x, moved.y]);
  assert.equal(street.anchor("cat"), live);
  const emptyGround = { x: base.x, y: base.y };
  assert.deepEqual(findPath(base.approach, emptyGround, street.scene)?.at(-1), emptyGround);
  street.update(base);
  assert.equal(floor(base), true);
  assert.deepEqual(
    findPath(base, base.approach, street.scene)?.at(-1),
    base.approach,
  );
  street.update(base.approach);
  assert.equal(floor(base), false);
  assert.deepEqual([live.x, live.y], [base.x, base.y]);
});

test("overlay edges follow the same union outline used for walking", () => {
  const rect = (x: number) => [
    { x, y: 0 },
    { x: x + 50, y: 0 },
    { x: x + 50, y: 40 },
    { x, y: 40 },
  ];
  for (const offset of [45, 50]) {
    const banks = surfaceOutline([rect(0), rect(offset)]);
    assert.ok(banks.length >= 4);
    assert.ok(
      banks.every(
        ({ a, b }) => a.y === b.y || a.x === 0 || a.x === offset + 50,
      ),
    );
  }
});
