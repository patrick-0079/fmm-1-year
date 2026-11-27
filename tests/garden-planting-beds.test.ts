import assert from "node:assert/strict";
import test from "node:test";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";

test("the garden keeps the photo station, rose arch and picnic paths open around planted roots", () => {
  const map = scenes.garden;
  for (const [x,y] of [[171,448],[232,451],[257,462],[72,460],[143,522],[671,518]]) {
    assert.equal(canStand({x,y}, map.walls, map.bounds, map.floor, map.surfaces), false, "flower bed at " + [x,y]);
  }
  for (const [x,y] of [[125,430],[174,437],[230,439],[242,435],[277,451],[179,503],[300,511],[703,523]]) {
    const p = {x,y};
    for (const [start, end] of [[map.spawn,p],[p,map.spawn]]) {
      const route = findPath(start, end, map, map.hazards);
      assert.deepEqual(route?.at(-1), end, "path at " + [x,y]);
      let from = start;
      for (const to of route!) {
        assert.ok(canTravelBetween(from, to, map, map.hazards));
        from = to;
      }
    }
  }
});
