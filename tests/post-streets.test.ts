import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath, type Point } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { readJourney } from "../src/journey.ts";

const town = scenes.town;
const point = ([x,y]: number[]): Point => ({x,y});
const mainStreet = point([485,837]);
const postman = town.spots.find(spot => spot.id === "npc-post")!.approach;

function checkPaving(vertices: number[][]) {
  const points = vertices.map(point);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    assert.ok(canTravelBetween(a,b,town) && canTravelBetween(b,a,town),
      `blocked paving at ${a.x},${a.y} – ${b.x},${b.y}`);
  }
}

test("the lower postal lane follows the illustrated turn around the island and up the stairs", () => {
  checkPaving([
    [522,736],[520,757],[510,783],[498,812],[485,829],[479,838],[460,828],
    [445,825],[437,822],[426,814],[405,801],[385,790],[365,777],[345,760],
    [335,754],[327,751],[318,749],[314,740],[313,721],[313,704],[320,700],
  ]);
  for (const [from,to] of [[mainStreet,postman],[postman,mainStreet]]) {
    const path = findPath(from,to,town);
    assert.ok(path);
    assert.deepEqual(path.at(-1),to);
    assert.ok(path.some(p => p.x > 375 && p.x < 420 && p.y > 780), "take the lower fork");
    assert.ok(path.every(p => p.y >= 690), "no detour around the north side");
  }
});

test("both lower flights, the upper postal terrace and the northern fork remain connected", () => {
  checkPaving([[346,715],[347,723],[347,735],[347,742],[349,744],[350,750],[356,756]]);
  checkPaving([[320,700],[310,687],[300,682],[302,658],[301,634],[308,622],[310,606]]);
  checkPaving([
    [320,700],[340,687],[362,682],[384,671],[389,665],[397,655],[405,648],
    [414,639],[435,643],[460,669],[487,685],[515,710],
  ]);
  const path = findPath(point([525,690]),postman,town);
  assert.deepEqual(path?.at(-1),postman);
  assert.ok(path?.every(p => p.y < 715));
});

test("postal steps and paving cannot be used to cut through the island or its street furniture", () => {
  for (const pair of [
    [330,722], [414,725], [429,775], [286,676], [414,674], [471,712],
    [449,812], [215,619], [123,615], [310,578],
  ]) {
    assert.equal(canStand(point(pair),town.walls,town.bounds,town.floor,town.surfaces),
      false,`unexpected opening at ${pair}`);
  }
  assert.equal(canTravelBetween(point([320,700]),point([522,736]),town),false);
});

test("saves on the old postal cut-through resume safely and saves on the lower lane stay in place", () => {
  const save = {scene:"town",savedAt:1234};
  const resume = (x: number, y: number) => readJourney(JSON.stringify({...save,x,y}),[]);
  assert.deepEqual(resume(414,765),{...save,...town.spawn});
  assert.deepEqual(resume(405,801),{...save,x:405,y:801});
});
