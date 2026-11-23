import assert from "node:assert/strict";
import test from "node:test";
import { canStand, findPath, polygonContains } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { readJourney } from "../src/journey.ts";
import { roomFurniture } from "../src/room-furniture.ts";
import { ruinsForeground } from "../src/ruins-foreground.ts";

test("floor behind the raised presents and cake stays accessible up to each actual base", () => {
  const room = scenes.room;
  const stand = (x: number,y: number) => canStand({x,y},room.walls,room.bounds,room.floor,room.surfaces);
  for (const [x,y] of [[493,305],[499,303],[494,314],[550,273],[300,191],[300,254]]) assert.ok(stand(x,y),String([x,y]));
  for (const [x,y] of [[513,303],[506,340],[550,295],[300,221]]) assert.ok(!stand(x,y),String([x,y]));
  const hatbox = roomFurniture.find(p => p.id === "gift-hatbox")!;
  assert.ok(polygonContains({x:550,y:273},hatbox.points));
  assert.ok(!polygonContains({x:499,y:303},hatbox.points));
  for (const spot of room.spots) assert.deepEqual(findPath(room.spawn,spot.approach,room)?.at(-1),spot.approach,spot.id);
});

test("the pink parcel leaves no isolated landing between the vase and east wall", () => {
  const room = scenes.room;
  const saveAt = (x:number,y:number) => ({scene:"room",x,y,savedAt:1234});
  for (const [x,y] of [[578,326],[579,325],[579.8,324.3],[580,324.35]]) {
    assert.equal(canStand({x,y},room.walls,room.bounds,room.floor,room.surfaces),false);
    assert.deepEqual(readJourney(JSON.stringify(saveAt(x,y)),[]),saveAt(room.spawn.x,room.spawn.y));
  }
  const floor = {x:580,y:300};
  assert.deepEqual(findPath(room.spawn,floor,room)?.at(-1),floor);
  assert.deepEqual(findPath(floor,room.spawn,room)?.at(-1),room.spawn);
  assert.deepEqual(readJourney(JSON.stringify(saveAt(floor.x,floor.y)),[]),saveAt(floor.x,floor.y));
});

test("ruin arches and parapets cover their stonework while keeping entrances and the central staircase clear", () => {
  const covers = (x:number,y:number) => ruinsForeground.filter(p => polygonContains({x,y},p.points)).map(p => p.id);
  const landmarks: [number,number,string][] = [
    [210,253,"serpent-arch"],[697,255,"winch-arch"],[391,506,"south-stair-west-jamb"],
    [506,513,"south-stair-east-jamb"],[300,382,"west-pool-parapet"],[611,381,"east-pool-parapet"],
  ];
  for (const [x,y,id] of landmarks) assert.deepEqual(covers(x,y),[id]);
  for (const [x,y] of [[192,260],[712,255],[450,511],[450,480],[601,330]]) assert.deepEqual(covers(x,y),[]);
  const ruins = scenes.ruins;
  for(const spot of ruins.spots) assert.deepEqual(findPath(ruins.spawn,spot.approach,ruins)?.at(-1),spot.approach,spot.id);
});
