import test from "node:test";
import assert from "node:assert/strict";
import { BlocksGame, HopGame } from "../src/arcade-engines.ts";
import { MinesGame } from "../src/arcade-bonus.ts";
import { canTravelBetween, findPath, type Geometry } from "../src/core.ts";
import { reservedShortcut } from "../src/input.ts";

test("pausing clears soft drop and cancels a held jump without launching it", () => {
  const blocks = new BlocksGame(() => 0);
  blocks.start();
  blocks.input("down", true);
  blocks.cancelInput();
  blocks.update(0.1);
  assert.equal(blocks.y, 0);
  const hop = new HopGame(() => 0.5);
  hop.start();
  hop.input("primary", true);
  hop.update(0.8);
  hop.cancelInput();
  hop.input("primary", false); // A late keyup after returning to the page.
  hop.update(0.1);
  assert.equal(hop.grounded, true);
  assert.equal(hop.charge, 0);
  assert.equal(hop.charging, false);
});

test("the first mines hint skips flags and never charges for a no-op", () => {
  const game = new MinesGame(() => 0.5);
  game.start();
  game.input("drop", true);
  game.hint();
  assert.equal(game.hints, 2);
  assert.ok(game.revealed.size > 0);
  assert.ok(game.flags.has(0));
  assert.equal(game.revealed.has(0), false);
  const allFlagged = new MinesGame();
  allFlagged.start();
  allFlagged.flags = new Set(Array.from({ length: 30 }, (_, i) => i));
  allFlagged.hint();
  assert.equal(allFlagged.hints, 3);
  assert.equal(allFlagged.revealed.size, 0);
});

test("browser shortcuts and composing text never become game actions", () => {
  const plain = { ctrlKey: false, metaKey: false, altKey: false, isComposing: false };
  assert.equal(reservedShortcut(plain), false);
  for (const key of Object.keys(plain))
    assert.equal(reservedShortcut({ ...plain, [key]: true }), true);
});

test("short open-ground routes go directly to their exact destination", () => {
  const geometry: Geometry = { walls: [], bounds: { x: 0, y: 0, w: 300, h: 300 } };
  const goal = { x: 173, y: 117 };
  assert.deepEqual(findPath({ x: 50, y: 100 }, goal, geometry), [goal]);
});

test("path shortcuts never cross walls, and blocked clicks still stop beside them", () => {
  const geometry: Geometry = {
    walls: [{ x: 120, y: 80, w: 12, h: 120 }],
    bounds: { x: 0, y: 0, w: 300, h: 300 },
  };
  const start = { x: 95, y: 115 }, goal = { x: 147, y: 115 };
  const path = findPath(start, goal, geometry)!;
  assert.ok(path.length > 1);
  assert.deepEqual(path.at(-1), goal);
  let previous = start;
  for (const point of path) {
    assert.ok(canTravelBetween(previous, point, geometry));
    previous = point;
  }
  const blocked = findPath(start, { x: 125, y: 117 }, geometry)!;
  assert.ok(blocked.length);
  previous = start;
  for (const point of blocked) {
    assert.ok(canTravelBetween(previous, point, geometry));
    previous = point;
  }
  assert.ok(Math.hypot(blocked.at(-1)!.x - 125, blocked.at(-1)!.y - 117) <= 36);
});
