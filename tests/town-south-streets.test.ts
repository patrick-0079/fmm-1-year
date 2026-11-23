import assert from "node:assert/strict";
import test from "node:test";
import { canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { readJourney } from "../src/journey.ts";

const town = scenes.town;

test("the wheat-field stairs, arch and lower path form one walkable trail", () => {
  checkWalk([[130,733],[135,755],[134,774],[128,783],[113,792],[108,800],
    [122,819],[138,842],[154,862],[158,876],[162,889],[175,908],[191,948],
    [204,966],[225,981],[254,998],[281,1012]]);
  checkWalk([[204,966],[195,973],[185,978],[175,982],[166,984],[158,992],
    [150,995],[136,1000],[127,1004]]);
  checkSolid([[135,822],[144,888],[180,881],[183,867],[219,924],[173,973],[135,988],[250,958]]);
});

test("the southern roadway connects the gate, pond sidewalk, cat and dock", () => {
  checkWalk([[451,956],[479,946],[510,942],[546,950],[572,962],[606,977],
    [647,986],[689,987],[710,983],[719,974],[721,962],[737,959],[753,958],[777,962]]);
  const approach = town.spots.find(s => s.id === "visitor-zhenghao")!.approach;
  const dock = {x:824,y:939};
  assert.deepEqual(findPath(approach,dock,town)?.at(-1),dock);
  assert.deepEqual(findPath(dock,approach,town)?.at(-1),approach);
  checkSolid([[519,848],[586,949],[628,952],[682,962],[750,949],[821,980],[600,865]]);
});

test("saves on the workshop masonry recover and saves on the southern road resume in place", () => {
  const savedAt = 1793664000000;
  const saved = (x: number, y: number) => ({scene:"town",x,y,savedAt});
  assert.deepEqual(readJourney(JSON.stringify(saved(1007,588)),[]), {scene:"town",...town.spawn,savedAt});
  assert.deepEqual(readJourney(JSON.stringify(saved(593,977)),[]), saved(593,977));
});

function checkWalk(steps: number[][]) {
  const route = steps.map(([x,y]) => ({x,y}));
  for (let i = 1; i < route.length; i++) {
    const a = route[i-1], b = route[i];
    assert.ok(canTravelBetween(a,b,town) && canTravelBetween(b,a,town), steps[i].join(","));
  }
  for (const goal of [route[0],route[route.length-1]]) {
    assert.deepEqual(findPath(town.spawn,goal,town)?.at(-1), goal);
    assert.deepEqual(findPath(goal,town.spawn,town)?.at(-1), town.spawn);
  }
}

function checkSolid(samples: number[][]) {
  for (const [x,y] of samples) {
    assert.equal(canStand({x,y},town.walls,town.bounds,town.floor,town.surfaces), false, [x,y].join(","));
  }
}
