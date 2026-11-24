import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, polygonContains } from "../src/core.ts";
import { townScene } from "../src/town-map.ts";
import { townForeground } from "../src/town-foreground.ts";
import { northEastCanopies } from "../src/town-northeast-foliage.ts";
import { southWestCanopies } from "../src/town-southwest-foliage.ts";

const town = townScene;
const point = ([x,y]: number[]) => ({x,y});

test("the planted soil and bench legs exclude feet on either side of Heart Plaza", () => {
  for (const coords of [[679,492],[707,512],[774,508],[795,498],[797,494],[815,536],[902,433],
    [164,604],[197,614],[412,625],[466,743],[108,794],[61,718],[370,671],[145,1004],[94,738],[1325,137],[1318,144],[1032,339],[1359,189]]) {
    assert.equal(canStand(point(coords),town.walls,town.bounds,town.floor,town.surfaces),false,String(coords));
  }
});

test("the ring opening, bench-front paving, east corner and southern entrance stay open both ways", () => {
  for (const corridor of [
    [[94,736],[103,733]],
    [[1324,129],[1334,123]],
    [[717,400],[717,412],[716,424]],
    [[786,422],[802,424],[808,431],[819,435],[826,445]],
    [[880,465],[884,452],[896,448]],
    [[729,547],[728,522],[729,504],[738,490]],
    [[796,553],[806,548],[816,544],[826,540],[838,535],[850,530]],
  ]) {
    for (let i=1;i<corridor.length;i++) {
      const a=point(corridor[i-1]), b=point(corridor[i]);
      assert.ok(canTravelBetween(a,b,town) && canTravelBetween(b,a,town),String(corridor[i]));
    }
  }
});

test("sloping rose beds change depth along the curb and never paint the heart paving", () => {
  const roses = townForeground.filter(p=>p.id.startsWith("plaza-west-roses") || p.id.startsWith("plaza-east-roses"));
  const depthAt = (p: number[]) => roses.find(rose=>polygonContains(point(p),rose.points))?.y;
  const a = depthAt([649,466]), b = depthAt([679,491]), c = depthAt([795,498]), d = depthAt([861,475]);
  assert.ok(a !== undefined && b !== undefined && b > a + 15);
  assert.ok(c !== undefined && d !== undefined && c > d + 20);
  for (const ground of [[742,473],[753,509],[693,484],[803,485],[793,548]]) {
    assert.equal(depthAt(ground),undefined,String(ground));
  }
});

test("the branches at the wheat steps and mine overhang walkable ground", () => {
  for (const [tree,feet] of [
    [southWestCanopies.find(t=>t.x === 236)!,[236,721]],
    [northEastCanopies.find(t=>t.x === 1174)!,[1161,172]],
  ] as const) {
    const p=point(feet);
    assert.ok(canStand(p,town.walls,town.bounds,town.floor,town.surfaces));
    assert.ok(p.y < tree.y && polygonContains(p,tree.points));
  }
});
