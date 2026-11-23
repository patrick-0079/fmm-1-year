import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes, type SceneId } from "../src/maps.ts";
import { creeks } from "../src/creek-layout.ts";
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

test("the courage garden ends at the north hedge and keeps its flower approach and south exit open", () => {
  checkFeet("challenge", [[92,270],[784,325],[135,151],[450,125],[450,557]],
    [[610,520],[194,504],[829,265],[399,551],[450,80]]);
  assert.ok(canTravelBetween({x:450,y:510},{x:450,y:560},scenes.challenge));
  assert.deepEqual(scenes.challenge.spots.filter(spot => spot.portal).map(spot => spot.id), ["return-gate"]);
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

test("the desk leg and chair leave a lane on the bare boards to the east", () => {
  checkFeet("room", [[77,244],[88,179]], [[62,249],[98,222]]);
  assert.ok(canTravelBetween({x:105,y:244},{x:77,y:244},scenes.room));
});

test("garden lamp bases, porch planters and the arch feet stop shoes while the adjacent paths stay open", () => {
  checkFeet("garden",
    [[302,512],[141,369],[401,433],[479,438],[790,350]],
    [[300,500],[155,475],[142,351],[385,425],[497,425],[411,161],[471,161],
      [284,135],[613,135],[623,106],[788,334],[601,298],[275,270],[802,266],[634,271],
      [602,483],[789,469],[357,398],[526,399]]);
  assert.ok(canTravelBetween({x:331,y:511},{x:300,y:511},scenes.garden));
  assert.ok(canTravelBetween({x:111,y:350},{x:124,y:350},scenes.garden));
});

test("the last stones on the courage trail and the tiles beside both ruined arcades stay connected", () => {
  checkFeet("challenge", [[440,94],[450,91]], [[450,82]]);
  assert.ok(canTravelBetween({x:440,y:125},{x:440,y:94},scenes.challenge));
  checkFeet("ruins", [[226,267],[674,267],[254,171],[646,171]], [[211,270],[690,270]]);
  for (const x of [226,674]) {
    const north = {x,y:263}, south = {x,y:295};
    assert.ok(canTravelBetween(north,south,scenes.ruins));
    assert.ok(canTravelBetween(south,north,scenes.ruins));
  }
});
