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
  assert.ok(polygonContains({x:739,y:331},bakery.points));
  assert.ok(!polygonContains({x:742,y:350},bakery.points));
  assert.ok(canTravelBetween({x:781,y:283},{x:789,y:319},scenes.town));
  assert.equal(new Set(townForeground.map(part=>part.id)).size,townForeground.length);
});

test("the workshop mailbox, descending rose bed and lamp restore only the painted silhouettes", () => {
  const cases = [
    ["workshop-blue-postbox", [976,491], [992,512]],
    ["workshop-rose-border-west", [968,538], [985,529]],
    ["workshop-rose-border-east", [1019,564], [1020,546]],
    ["workshop-junction-lamp", [939,316], [928,316]],
    ["workshop-junction-lamp-west-flag", [933,350], [922,352]],
    ["workshop-junction-lamp-east-flag", [950,349], [960,358]],
    ["bakery-stair-rise-3", [778,326], [775,327]],
    ["bakery-stair-post-knot", [813,250], [819,252]],
  ] as const;
  for (const [id,[sx,sy],[cx,cy]] of cases) {
    const layer = townForeground.find(part=>part.id===id)!;
    assert.ok(polygonContains({x:sx,y:sy},layer.points),id+" should cover the object");
    assert.ok(!polygonContains({x:cx,y:cy},layer.points),id+" should leave the gap open");
  }
  const town = scenes.town;
  for (const [x,y] of [[972,538],[987,544],[953,518],[960,523],[976,518],[939,393]])
    assert.ok(!canStand({x,y},town.walls,town.bounds,town.floor,town.surfaces));
  const lanes = [
    [[949,506],[953,507],[958,504]],
    [[990,530],[998,530],[1005,538],[1026,550]],
    [[781,283],[789,319],[803,324]],
  ];
  for (const lane of lanes) for(let i=1;i<lane.length;i++) {
    const [sx,sy]=lane[i-1], [ex,ey]=lane[i];
    assert.ok(canTravelBetween({x:sx,y:sy},{x:ex,y:ey},town));
    assert.ok(canTravelBetween({x:ex,y:ey},{x:sx,y:sy},town));
  }
});
