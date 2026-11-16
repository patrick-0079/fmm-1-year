import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, polygonContains } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { townForeground } from "../src/town-foreground.ts";

test("town flower gates and quarry beam cover their artwork, leaving the openings and steps transparent", () => {
  const cases = [
    {id:"flower-arch", depth:328, solid:{x:236,y:262}, opening:{x:234,y:295}, ground:{x:233,y:338}},
    {id:"pond-arch", depth:909, solid:{x:928,y:834}, opening:{x:929,y:878}, ground:{x:926,y:916}},
    {id:"quarry-lintel", depth:91, solid:{x:1428,y:31}, opening:{x:1428,y:65}, ground:{x:1424,y:108}},
  ];
  for (const {id,depth,solid,opening,ground} of cases) {
    const layer = townForeground.find(part => part.id === id)!;
    assert.equal(layer.y, depth);
    assert.ok(polygonContains(solid,layer.points),id+" must restore the crossbeam");
    assert.ok(!polygonContains(opening,layer.points),id+" must not repaint paving over the player");
    assert.ok(!polygonContains(ground,layer.points),id+" must leave foreground ground clear");
  }
});

test("splitting gate artwork does not close either stair passage or change solid post feet", () => {
  const town = scenes.town;
  const routes = [
    [{x:233,y:278},{x:233,y:303},{x:233,y:328},{x:246,y:346}],
    [{x:925,y:854},{x:925,y:875},{x:924,y:897},{x:915,y:911}],
    [{x:1424,y:108},{x:1424,y:96},{x:1428,y:82}],
  ];
  for (const route of routes) for (let i=1;i<route.length;i++) {
    assert.ok(canTravelBetween(route[i-1],route[i],town));
    assert.ok(canTravelBetween(route[i],route[i-1],town));
  }
  for (const [x,y] of [[210,324],[260,322],[903,894],[952,906],[1399,84],[1458,84]])
    assert.ok(!canStand({x,y},town.walls,town.bounds,town.floor,town.surfaces));
});

test("cross-street pennants have their own foreground without creating a wall underneath", () => {
  const north = townForeground.find(part => part.id === "north-stair-pennants")!;
  const bakery = townForeground.find(part => part.id === "bakery-stair-pennants")!;
  assert.ok(polygonContains({x:525,y:200},north.points));
  assert.ok(!polygonContains({x:525,y:210},north.points));
  assert.ok(polygonContains({x:742,y:337},bakery.points));
  assert.ok(!polygonContains({x:742,y:350},bakery.points));
  assert.ok(canTravelBetween({x:781,y:283},{x:789,y:319},scenes.town));
  assert.equal(new Set(townForeground.map(part=>part.id)).size,townForeground.length);
});
