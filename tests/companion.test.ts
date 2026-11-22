import test from "node:test";
import assert from "node:assert/strict";
import { CompanionMotion, COMPANION_GAP, companionJoinPoint } from "../src/companion-motion.ts";
import { findPath, advancePath, canStand, canTravelBetween } from "../src/core.ts";
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
    assert.ok(Math.hypot(player.x - follower.position.x, player.y - follower.position.y) < COMPANION_GAP+8);
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
  assert.ok(Math.hypot(follower.position.x-300,follower.position.y-300)>=24);
  assert.ok(canStand(follower.position,room.walls,room.bounds,room.floor,room.surfaces));
});

test("joining and map arrivals keep companions beside players at real scene interaction points", () => {
  for(const [id,scene] of Object.entries(scenes)) {
    for(const [label,player] of [["spawn",scene.spawn],...scene.spots.map(s=>[s.id,s.approach])] as const) {
      const at=companionJoinPoint(player,scene);
      assert.ok(canStand(at,scene.walls,scene.bounds,scene.floor,scene.surfaces),id+" "+label);
      assert.ok(canTravelBetween(player,at,scene),id+" "+label+" no path to pet");
      assert.ok(Math.hypot(at.x-player.x,at.y-player.y)>=24,id+" "+label+" pet must not cover player");
    }
  }
});

test("an idle companion takes a safe visible sidestep out of the player's body", () => {
  const scene=scenes.garden,player={x:354,y:327},follower=new CompanionMotion();
  const unchanged={...player};follower.reset(player);
  for(let i=0;i<30;i++) {
    const before={...follower.position};follower.update(player,scene,.05,true);
    assert.ok(Math.hypot(follower.position.x-before.x,follower.position.y-before.y)<=5.50001);
    assert.ok(canStand(follower.position,scene.walls,scene.bounds,scene.floor,scene.surfaces));
  }
  assert.ok(Math.hypot(follower.position.x-player.x,follower.position.y-player.y)>=COMPANION_GAP-.01);
  assert.deepEqual(player,unchanged);
});

test("a companion steps away on its current side rather than walking through the player", () => {
  const geometry={bounds:{x:0,y:0,w:200,h:200},walls:[]},player={x:100,y:100};
  for(const side of [-1,1]) {
    const follower=new CompanionMotion();follower.reset({x:100+side*10,y:100});
    for(let i=0;i<20;i++) {
      follower.update(player,geometry,.05,true);
      assert.ok((follower.position.x-player.x)*side>=10);
    }
    assert.ok(Math.abs(follower.position.x-player.x)>=COMPANION_GAP-.01);
  }
});

test("after making room, the companion follows the next turn without retracing the old street", () => {
  const street = { bounds: { x: 0, y: 0, w: 300, h: 220 }, walls: [] };
  const follower = new CompanionMotion();
  const walk = (x: number, y: number) => follower.update({ x, y }, street, 1 / 60, true);
  follower.join({ x: 100, y: 110 }, street);

  // Walk east into the companion, pause while it makes room, then turn north.
  const corner = { x: 170, y: 110 };
  for (let x = 101; x <= corner.x; x++) walk(x, corner.y);
  for (let frame = 0; frame < 40; frame++) walk(corner.x, corner.y);
  assert.ok(follower.position.x >= corner.x + 24, "the companion must first yield on the player's right");
  for (let y = corner.y - 1; y >= 35; y--) {
    walk(corner.x, y);
    assert.ok(follower.position.x >= corner.x - 12, "the companion is heading back to old footsteps west of the corner");
  }
  assert.ok(follower.position.y <= 35 + COMPANION_GAP + 1, "the companion missed the north turn");
});
