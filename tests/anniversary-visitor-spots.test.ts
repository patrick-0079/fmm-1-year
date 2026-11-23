import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";
import { anniversaryVisitors } from "../src/anniversary-visitor-spots.ts";
import { scenes } from "../src/maps.ts";

test("anniversary guests have reachable feet and distinct keyboard and pointer targets", () => {
  for (const {scene, spot} of anniversaryVisitors) {
    const map = scenes[scene];
    const canStandHere = (p: {x:number; y:number}) => canStand(p, map.walls, map.bounds, map.floor, map.surfaces);
    assert.ok(!canStandHere(spot), spot.id);
    assert.ok(canStandHere(spot.approach), spot.id);
    assert.ok(findPath(map.spawn, spot.approach, map)?.length, spot.id);
    assert.equal(nearbyInteraction(spot.approach, map.spots)?.id, spot.id);
    assert.equal(clickedInteraction({x:spot.x, y:spot.y - spot.markerOffset!}, map.spots)?.id, spot.id);
  }
});

test("the planted edge beside Rabe stops feet before the lamp and leaves the south gate open", () => {
  const map = scenes.challenge;
  for (const p of [{x:530,y:500}, {x:534,y:496}])
    assert.equal(canStand(p, map.walls, map.bounds, map.floor, map.surfaces), false);
  const guest = anniversaryVisitors.find(v => v.key === "rabe")!.spot;
  const gate = map.spots.find(s => s.id === "return-gate")!;
  assert.ok(canTravelBetween(guest.approach, gate.approach, map));
  assert.ok(canTravelBetween(gate.approach, guest.approach, map));
});
