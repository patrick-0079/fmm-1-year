import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes, type SceneId } from "../src/maps.ts";
import { creeks } from "../src/landscape.ts";
import { lightBrick, mirrorSpots } from "../src/ruins-map.ts";

function checkFeet(id: SceneId, open: number[][], solid: number[][]) {
  const map = scenes[id];
  for (const [clear, samples] of [[true, open], [false, solid]] as const) {
    for (const [x,y] of samples) {
      assert.equal(canStand({x,y}, map.walls, map.bounds, map.floor, map.surfaces), clear,
        `${id} ground at ${x},${y}`);
      if (clear) assert.deepEqual(findPath(map.spawn, {x,y}, map, map.hazards)?.at(-1), {x,y});
    }
  }
}

test("the room floor between the wicker basket and the balloon ties is reachable", () => {
  checkFeet("room", [[57,345],[88,345]], [[39,305],[56,373]]);
  assert.ok(canTravelBetween({x:114,y:345},{x:57,y:345},scenes.room));
});

test("garden feet follow the pond fence, western bench, cinema seats and gate posts", () => {
  checkFeet("garden",
    [[78,391],[82,198],[620,291],[715,225],[197,440]],
    [[100,150],[813,430],[53,365],[395,557],[482,559],[185,473],[650,264],[668,285]]);
});

test("both stream bridges admit crossings in each direction and stop feet at either rail", () => {
  for (const id of ["garden","challenge"] as const) {
    const b = creeks[id].bridge, left = {x:b.x-4,y:b.y+b.h/2}, right = {...left,x:b.x+b.w+4};
    for (const [a,z] of [[left,right],[right,left]]) assert.ok(canTravelBetween(a,z,scenes[id]));
    checkFeet(id, [], [[b.x+12,b.y+1],[b.x+b.w-12,b.y+b.h-2]]);
  }
});

test("the courage garden follows its riverbanks, woodland and two visible gate openings", () => {
  checkFeet("challenge", [[92,270],[784,325],[135,151],[450,86],[450,557]],
    [[610,520],[194,504],[829,265],[399,551]]);
  assert.ok(canTravelBetween({x:450,y:510},{x:450,y:560},scenes.challenge));
});

test("the two bronze mirror bases are solid and the engraved star tile stays walkable", () => {
  checkFeet("ruins", [[lightBrick.x,lightBrick.y],[551,309],[588,293]],
    mirrorSpots.map(s => [s.x,s.y+2]));
});

test("walking around the campfire, kettle and star jar leaves the open meadow accessible", () => {
  checkFeet("meadow", [[109,70],[204,211],[267,143],[230,177]],
    [[198,194],[252,139],[232,161]]);
  const a = {x:198,y:177}, b = {x:198,y:210};
  assert.ok(!canTravelBetween(a,b,scenes.meadow));
  assert.deepEqual(findPath(a,b,scenes.meadow)?.at(-1), b);
});
