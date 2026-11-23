import test from "node:test";
import assert from "node:assert/strict";
import { canStand, findPath, polygonContains } from "../src/core.ts";
import { townScene } from "../src/town-map.ts";
import { workshopCanopies, workshopFoliage } from "../src/town-workshop-vegetation.ts";

test("the block board lawn passes behind the fir and stays open up to the flowerbed stone cap", () => {
  const town = townScene;
  const fir = workshopCanopies.find(t => t.id === "blocks-pine")!;
  for (const [x,y] of [[1124,547],[1133,553]]) {
    assert.ok(polygonContains({x,y},fir.points) && y < fir.y);
    assert.deepEqual(findPath(town.spawn,{x,y},town)?.at(-1),{x,y});
  }
  for (const [x,y] of [[1124,507],[1074,512],[1269,534],[1232,518]]) {
    assert.ok(canStand({x,y},town.walls,town.bounds,town.floor,town.surfaces));
    assert.ok(![...workshopCanopies,...workshopFoliage].some(part=>polygonContains({x,y},part.points)));
  }
  const tip = workshopFoliage.find(p=>p.id === "blocks-hedge-tip")!;
  assert.ok(polygonContains({x:1257,y:524},tip.points));
  assert.ok(canStand({x:1257,y:524},town.walls,town.bounds,town.floor,town.surfaces));
  for (const [x,y] of [[1258,540],[1260,542],[1255,533]]) {
    assert.equal(canStand({x,y},town.walls,town.bounds,town.floor,town.surfaces),false);
  }
});
