import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath, polygonContains } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { courageBorder } from "../src/courage-border.ts";

const map = scenes.challenge;
test("the gardener's lantern and south treetops cover a visitor on the lawn without spilling onto the gate path", () => {
  for (const [id,x,y] of [
    ["gardener-gate-lamp-and-flowers",382,498], ["southwest-beech",154,444], ["southeast-beech",731,452],
  ] as const) {
    const layer=courageBorder.find(part=>part.id===id)!;
    assert.ok(canStand({x,y},map.walls,map.bounds,map.floor));
    assert.ok(layer.y>y && polygonContains({x,y},layer.points),id);
  }
  for (const [x,y] of [[450,530],[419,484],[408,484],[390,481],[731,435],[154,416]]) {
    assert.ok(courageBorder.every(part=>!polygonContains({x,y},part.points)),x+","+y);
  }
});
test("bare paving at the courage flower is reachable and the north hedge is solid", () => {
  const tile={x:450,y:86}, flower={x:450,y:125};
  assert.equal(canStand({x:450,y:80},map.walls,map.bounds,map.floor),false);
  assert.ok(canTravelBetween(flower,tile,map) && canTravelBetween(tile,flower,map));
  assert.deepEqual(findPath(map.spawn,tile,map,map.hazards)?.at(-1),tile);
});
