import assert from "node:assert/strict";
import test from "node:test";
import { canStand, findPath, readProgress } from "../src/core.ts";
import { elderPlaces, elderLines, guardianGreeting } from "../src/elders-data.ts";
import { scenes } from "../src/maps.ts";
import { clickedInteraction } from "../src/interaction.ts";

for (const scene of ["challenge", "ruins"] as const) {
  test(`Elder in ${scene} can be approached from spawn without blocking another interaction`, () => {
    const map = scenes[scene], elder = elderPlaces[scene];
    assert.equal(canStand(elder, map.walls, map.bounds, map.floor, map.surfaces), false);
    for (const spot of map.spots) {
      assert.deepEqual(findPath(map.spawn, spot.approach, map, map.hazards)?.at(-1), spot.approach, spot.id);
    }
    const distance = (p: {x: number; y: number}) => Math.hypot(elder.approach.x-p.x, elder.approach.y-p.y);
    const nearest = map.spots.filter(s => distance(s) < (s.radius ?? 48)).sort((a,b) => distance(a) - distance(b))[0];
    assert.equal(nearest?.id, elder.id);
    const touched = clickedInteraction({x: elder.x, y: elder.y - 20}, map.spots, s => s.y - (s.markerOffset ?? 10));
    assert.equal(touched?.id, elder.id);
  });
}

test("Guardian acknowledges prior puzzle solutions even when the story predates her invitation", () => {
  const legacy = readProgress(JSON.stringify({ astrolabe: {
    found:["vine","star","brass"], installed:true, turns:[0,0,0], mirrors:["\\","/"],
  }}));
  assert.equal(legacy.residents.guardianInvited, false);
  assert.equal(guardianGreeting(legacy.astrolabe, false), "solved");
  const fresh = readProgress(null);
  assert.equal(guardianGreeting(fresh.astrolabe, false), "challenge");
  assert.equal(guardianGreeting(fresh.astrolabe, true), "notebook");
  assert.equal(elderLines.challenge.reply?.next, "riddle");
  assert.equal(elderLines.riddle.reply?.next, "blessing");
  assert.equal(elderLines.blessing.showNotebook, true);
});
