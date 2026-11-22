import assert from "node:assert/strict";
import test from "node:test";
import { breezePulse, chimneyPhase } from "../src/breeze.ts";
import { fruitShift, windLevel } from "../src/scenery-wind.ts";
import type { World } from "../src/world.ts";

test("the breeze crosses successive patches, with a long still interval between passes", () => {
  for (const start of [2.5, 20.5, 42.5, 62.5]) {
    assert.ok(breezePulse(start + 0.34, 0) > 0);
    assert.equal(breezePulse(start + 0.34, 0.55), 0);
    assert.ok(breezePulse(start + 1.4, 0.3) > 0.65);
    assert.equal(breezePulse(start + 4, 0.9), 0);
    for (let t = start + 4; t < start + 17; t += 0.3) assert.equal(breezePulse(t, 0.15), 0);
  }
  assert.equal(chimneyPhase("dawn"), "bakery");
  assert.equal(chimneyPhase("day"), "bakery");
  assert.equal(chimneyPhase("dusk"), "books");
  assert.equal(chimneyPhase("night"), "books");
});

test("a fresh gust waits for an open conversation and never restarts halfway when it closes", () => {
  let speaking = true;
  const stub = { scene: "garden", ambientTime: 1, isPresentingDialogue: () => speaking };
  const world = stub as unknown as World;
  for (let i = 0; i < 34; i++) {
    stub.ambientTime = 1 + i * 0.07;
    assert.equal(windLevel(world, 0.1), 0);
  }
  speaking = false;
  for (let t = 3.4; t < 20.5; t += 0.1) {
    stub.ambientTime = t;
    assert.equal(windLevel(world, 0.1), 0);
  }
  stub.ambientTime = 21.8;
  assert.ok(windLevel(world, 0.1) > 0.7);
});

test("harvested branch fruit follow the soft bough and both trunk and roots stay pinned", () => {
  for (const [x, y] of [
    [17, 40],
    [53, 35],
    [35, 20],
  ]) {
    const atRest = fruitShift(x, y, 0),
      bent = fruitShift(x, y, 1);
    assert.deepEqual(atRest.x, 0);
    assert.ok(Math.abs(atRest.y) === 0);
    assert.ok(Math.hypot(bent.x, bent.y) > 0.15 && Math.hypot(bent.x, bent.y) < 2);
  }
  assert.deepEqual(fruitShift(36, 75, 1), { x: 0, y: 0 });
});
