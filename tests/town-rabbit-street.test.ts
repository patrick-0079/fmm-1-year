import test from "node:test";
import assert from "node:assert/strict";
import { canTravelBetween, findPath, movePlayer } from "../src/core.ts";
import { townScene as town } from "../src/town-map.ts";

const point = ([x, y]: number[]) => ({x, y});

test("the rabbit street post stands in front of the reported foot and protects the flowerbed", () => {
  const foot = point([438.1,433.5]);
  assert.ok(canTravelBetween(foot, foot, town));
  let walker = foot;
  for (let i = 0; i < 24; i++) {
    walker = movePlayer(walker,{x:0,y:1},0.025,town.walls,town.bounds,town.floor,town.surfaces);
  }
  assert.ok(walker.y > foot.y && walker.y < 437);
  for (const xy of [[376.5,410],[412.5,429.5],[439,444],[470.5,458],[375,438],
    [384,432],[400,432],[425,452],[493,480],[510,479]]) {
    const p = point(xy);
    assert.equal(canTravelBetween(p, p, town), false, String(xy));
  }
  // Sweep through each fence in both directions, independently of the bed
  // and the street boundary, to cover gaps between adjoining posts.
  for (const [label, from, to] of [
    ["月兔台北街木栏",[389,404],[384,422]],
    ["月兔台北街木栏",[428,422],[420,447]],
    ["月兔台北街木栏",[460,440],[450,465]],
    ["月兔台树旁白栅栏",[358,427],[369,447]],
    ["月兔台树西木栏",[300,416],[285,435]],
  ] as const) {
    const walls = town.walls.filter(wall => wall.label === label);
    const a = {x:from[0], y:from[1]}, b = {x:to[0], y:to[1]};
    assert.equal(canTravelBetween(a,b,{bounds:town.bounds,walls}), false, label);
    assert.equal(canTravelBetween(b,a,{bounds:town.bounds,walls}), false, label);
  }
});

test("the diagonal curb connects both colours of paving at the plaza lamp", () => {
  const steps = [[546,450],[555,443],[561,431],[551,422],[540,413],[548,396]].map(point);
  for (let i = 1; i < steps.length; i++) {
    assert.ok(canTravelBetween(steps[i-1],steps[i],town));
    assert.ok(canTravelBetween(steps[i],steps[i-1],town));
  }
  // The posts beside the matching stones and the rose pots still enclose the junction.
  for (const xy of [[535,392],[581,441],[593,447],[604,451],[620,430]]) {
    const p = point(xy);
    assert.equal(canTravelBetween(p,p,town), false, String(xy));
  }
});

test("players can round the tree, follow the street and return to the bench around the pots", () => {
  const street = [[357,424],[365,418],[367,407],[375,399],[389,405],[410,417],
    [425,423],[438.1,433.5],[455,437],[486,451],[503,457],[516,463],
    [521,472],[521,481],[519,491],[503,496],[480,497],[446,498]].map(point);
  for (let i = 1; i < street.length; i++) {
    assert.ok(canTravelBetween(street[i-1],street[i],town));
    assert.ok(canTravelBetween(street[i],street[i-1],town));
  }
  const lawn = point([448,605]);
  for (const p of [street[0],street[7],street.at(-1)!]) {
    assert.deepEqual(findPath(lawn,p,town)?.at(-1), p);
    assert.deepEqual(findPath(p,lawn,town)?.at(-1), lawn);
  }
});
