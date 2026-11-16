import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { XiaoyeHug, XIAOYE_HUG_SECONDS, xiaoyeFootprint, xiaoyeFrame, xiaoyeLanternOn,
  xiaoyeFrames, xiaoyeLanternPoint, xiaoyeScale, xiaoyeSpot } from "../src/xiaoye-data.ts";

test("Xiaoye's hug approach remains accessible without blocking existing garden activities", () => {
  const garden = scenes.garden;
  const scene = garden;
  assert.equal(scene.walls.filter(w => w.label === xiaoyeFootprint.label).length, 1);
  assert.equal(scene.spots.filter(s => s.id === xiaoyeSpot.id).length, 1);
  assert.ok(canStand(xiaoyeSpot.approach, scene.walls, scene.bounds, scene.floor, scene.surfaces));
  assert.ok(!canStand(xiaoyeSpot, scene.walls, scene.bounds, scene.floor, scene.surfaces));
  assert.deepEqual(findPath(scene.spawn, xiaoyeSpot.approach, scene)?.at(-1), xiaoyeSpot.approach);
  assert.ok(canTravelBetween({ x: 305, y: 340 }, { x: 450, y: 340 }, scene));
  assert.ok(canTravelBetween({ x: 450, y: 340 }, { x: 571, y: 340 }, scene));
  for (const spot of scene.spots) {
    assert.deepEqual(findPath(scene.spawn, spot.approach, scene)?.at(-1), spot.approach, spot.id);
    assert.ok(Math.hypot(spot.x - xiaoyeSpot.x, spot.y - xiaoyeSpot.y) > 52 || spot.id === xiaoyeSpot.id,
      "new embrace must not crowd " + spot.id);
  }
});

test("Xiaoye carries a lantern from dusk through night, with matching day/night embrace frames", () => {
  for (const phase of ["dawn", "day"] as const) {
    assert.equal(xiaoyeLanternOn(phase), false);
    assert.equal(xiaoyeFrame(phase, false), 0);
    assert.equal(xiaoyeFrame(phase, true), 1);
  }
  for (const phase of ["dusk", "night"] as const) {
    assert.equal(xiaoyeLanternOn(phase), true);
    assert.equal(xiaoyeFrame(phase, false), 2);
    assert.equal(xiaoyeFrame(phase, true), 3);
  }
});

test("an embrace does not restart on repeated activation, and movement or panel takeover cancels it", () => {
  const hug = new XiaoyeHug(), player = { ...xiaoyeSpot.approach };
  assert.equal(hug.begin(player), true);
  hug.tick(.9, player, true);
  const progress = hug.progress;
  assert.equal(hug.begin(player), false);
  assert.equal(hug.progress, progress);
  hug.tick(0, { x: player.x + 8, y: player.y }, true);
  assert.equal(hug.active, false);
  assert.equal(hug.begin(player), true);
  hug.tick(0, player, false);
  assert.equal(hug.active, false);
  assert.equal(hug.begin(player), true);
  hug.tick(XIAOYE_HUG_SECONDS, player, true);
  assert.equal(hug.active, false);
  assert.deepEqual(player, xiaoyeSpot.approach);
});

test("remote, nonfinite and stale hugs cannot persist; either side can request a fresh hug", () => {
  const hug = new XiaoyeHug();
  assert.equal(hug.begin({ x: 900, y: 500 }), false);
  assert.equal(hug.begin({ x: NaN, y: 340 }), false);
  const player = { x: xiaoyeSpot.x - 24, y: xiaoyeSpot.y + 2 };
  assert.equal(hug.begin(player), true);
  assert.equal(hug.mirrored, true);
  hug.tick(-1, player, true); hug.tick(NaN, player, true);
  assert.equal(hug.progress, 0);
  hug.cancel();
  assert.equal(hug.active, false);
  assert.equal(hug.begin(xiaoyeSpot.approach), true);
  assert.equal(hug.mirrored, false);
  hug.tick(0, { x: Infinity, y: 340 }, true);
  assert.equal(hug.active, false);
});

test("all four measured sprites keep the same head-to-foot height, and lantern glow follows the correct paw", () => {
  for (const [i, frame] of xiaoyeFrames.entries()) {
    assert.ok(frame.x >= 0 && frame.y >= 0 && frame.x + frame.w <= 1536 && frame.y + frame.h <= 1024);
    assert.ok(frame.footX > frame.x && frame.footX < frame.x + frame.w);
    assert.ok(frame.footY > frame.y && frame.footY < frame.y + frame.h);
    if (frame.paw) {
      assert.ok(frame.paw.x >= frame.x && frame.paw.y >= frame.y);
      assert.ok(frame.paw.x + frame.paw.w <= frame.x + frame.w);
      assert.ok(frame.paw.y + frame.paw.h <= frame.y + frame.h);
    }
    const scale = xiaoyeScale(i, 60);
    assert.equal((frame.footY - frame.top) * scale, 60);
    if (i < 2) assert.equal(xiaoyeLanternPoint(i, 60, false, 0), null);
    else {
      const normal = xiaoyeLanternPoint(i, 60, false, .035)!;
      const mirrored = xiaoyeLanternPoint(i, 60, true, .035)!;
      assert.ok(normal.x < -16 && normal.x > -25);
      assert.ok(normal.y < -10 && normal.y > -18);
      assert.equal(mirrored.x, -normal.x);
      assert.equal(mirrored.y, normal.y);
    }
  }
});
