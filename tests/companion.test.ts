import test from "node:test";
import assert from "node:assert/strict";
import { CompanionMotion } from "../src/companion-motion.ts";
import { findPath, advancePath, canStand } from "../src/core.ts";
import { scenes } from "../src/maps.ts";

for (const [id, scene] of Object.entries(scenes)) {
  test(`companion follows real footsteps in ${id} without blocking travel or crossing solids`, () => {
    const follower = new CompanionMotion();
    follower.reset(scene.spawn);
    let player = { ...scene.spawn };
    let path = findPath(player, scene.spots[0].approach, scene, scene.hazards)!;
    assert.ok(path);
    for (let i = 0; i < 2400 && path.length; i++) {
      const step = advancePath(player, path, 0.05, scene);
      assert.equal(step.blocked, false);
      player = step.point;
      path = step.remaining;
      follower.update(player, scene, 0.05, true);
      assert.ok(Number.isFinite(follower.position.x));
      assert.ok(canStand(follower.position, scene.walls, scene.bounds, scene.floor, scene.surfaces));
    }
    assert.equal(path.length, 0);
    for (let i = 0; i < 60; i++) follower.update(player, scene, 0.05, true);
    assert.ok(Math.hypot(player.x - follower.position.x, player.y - follower.position.y) < 28);
  });
}

test("paused, suspended and sleeping companions do no movement or collision work", () => {
  const follower = new CompanionMotion();
  follower.reset({ x: 40, y: 40 });
  const unavailableGeometry = { get walls(): never { throw new Error("Should not inspect the map while paused"); } };
  for (let i = 0; i < 100; i++)
    follower.update({ x: 80, y: 40 }, unavailableGeometry as never, 0.05, false);
  follower.update({ x: 80, y: 40 }, unavailableGeometry as never, 0, true);
  assert.deepEqual(follower.position, { x: 40, y: 40 });
});

test("portals and same-scene respawns discard stale follower paths", () => {
  const follower = new CompanionMotion(), room = scenes.room;
  follower.reset(room.spawn);
  follower.update({ x: 1000, y: 1000 }, room, 0.05, false);
  follower.reset(scenes.garden.spawn);
  assert.deepEqual(follower.position, scenes.garden.spawn);
  follower.update({ x: 300, y: 300 }, room, 0.05, true);
  assert.deepEqual(follower.position, { x: 300, y: 300 });
});
