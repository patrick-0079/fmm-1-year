import assert from "node:assert/strict";
import test from "node:test";
import { canStand, canTravelBetween, findPath, polygonContains } from "../src/core.ts";
import { townScene } from "../src/town-map.ts";
import { northStreetCanopies, northStreetForeground } from "../src/town-north-street-details.ts";

const town = townScene;
const stand = (x: number, y: number) => canStand({ x, y }, town.walls, town.bounds, town.floor, town.surfaces);

test("northern terrace props block their feet and allow walking on the neighbouring paving", () => {
  for (const [x, y] of [[451,274],[738,246],[838,234],[537,389],[1286,142],[138,257],[1060,186]]) {
    assert.equal(stand(x, y), false, `base at ${x},${y}`);
  }
  for (const [x, y] of [[477,279],[748,247],[835,242],[551,390],[1284,134],[145,243],[1059,197]]) {
    assert.ok(stand(x, y), `paving at ${x},${y}`);
  }
});

test("a walker on the back steps passes behind the lamp, tree and mine posts with gaps beside them", () => {
  const outlines = [...northStreetForeground, ...northStreetCanopies];
  for (const [id, inside, outside] of [
    ["florist-stair-lantern", [451,254], [461,254]],
    ["north-step-oak", [550,92], [560,92]],
    ["quarry-rail-post-3", [1284,134], [1279,137]],
  ] as const) {
    const outline = outlines.find(shape => shape.id === id)!;
    assert.ok(stand(...inside));
    assert.ok(inside[1] < outline.y);
    assert.ok(polygonContains({ x: inside[0], y: inside[1] }, outline.points));
    assert.equal(polygonContains({ x: outside[0], y: outside[1] }, outline.points), false);
  }
});

test("the narrow passage around the bakery flowerpot connects its doorstep with the front steps", () => {
  const walk = [[756,252],[747,252],[733,252],[726,250],[718,246],[715,245],[702,234]].map(([x, y]) => ({ x, y }));
  assert.deepEqual(findPath(town.spawn, walk.at(-1)!, town)?.at(-1), walk.at(-1));
  for (let i = 1; i < walk.length; i++) {
    assert.ok(canTravelBetween(walk[i - 1], walk[i], town));
    assert.ok(canTravelBetween(walk[i], walk[i - 1], town));
  }
});
