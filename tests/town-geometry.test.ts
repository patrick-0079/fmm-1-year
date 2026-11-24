import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, findPath, movePlayer } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { townCanopies, festivalProps } from "../src/town-scenery.ts";
import { townGates, gatePosts, crossedTownGate } from "../src/gate-layout.ts";
import { townAttractionBases, townAttractionSpots, wishPairs } from "../src/town-attraction-layout.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";

const square = (left: number, right: number) => [
  { x: left, y: 0 },
  { x: right, y: 0 },
  { x: right, y: 100 },
  { x: left, y: 100 },
];

test("gate pillars block both sides without filling the walk-through opening", () => {
  for (const g of townGates) {
    const s = scenes[g.scene];
    const stands = (p: {x: number; y: number}) => canStand(p, s.walls, s.bounds, s.floor, s.surfaces);
    assert.ok(stands(g), `${g.id}: the opening must be clear`);
    assert.ok(canTravelBetween(g.approach, g, s), `${g.id}: the landing must lead to the threshold`);
    for (const post of gatePosts(g)) assert.ok(!stands({x: post.x + post.w/2, y: post.y + post.h/2}));
  }
});

test("the painted lanes lead through their real openings and crossings only fire when leaving", () => {
  const garden=scenes.garden;
  for (const lane of [
    [[447,427],[470,451],[521,474],[555,500],[573,527],[573,555],[569,575]],
    [[684,144],[732,123],[751,108],[761,85],[775,69],[795,57],[816,56],[839,56]],
  ]) for (let i=1;i<lane.length;i++) {
    const [x,y]=lane[i-1], [ex,ey]=lane[i];
    assert.ok(canTravelBetween({x,y},{x:ex,y:ey},garden), `painted lane blocked: ${x},${y} → ${ex},${ey}`);
  }
  for (const g of townGates) {
    const dx=g.kind==="bridge" ? 2 : 0, dy=g.kind==="wicket" ? 2 : g.kind==="stairs" ? -2 : 0;
    const before={x:g.x-dx,y:g.y-dy}, after={x:g.x+dx,y:g.y+dy};
    assert.equal(crossedTownGate(g.scene,before,after)?.id,g.id);
    assert.equal(crossedTownGate(g.scene,after,before),undefined);
    assert.equal(crossedTownGate(g.scene,g.approach,g.approach),undefined);
    assert.equal(crossedTownGate(g.scene,{x:before.x+35,y:before.y+35},{x:after.x+35,y:after.y+35}),undefined);
  }
});

test("all raised playground bases stand on open ground and have solid feet", () => {
  const s = scenes.town;
  const bases = new Set<typeof s.walls[number]>(townAttractionBases);
  const terrain = s.walls.filter(wall => !bases.has(wall));
  for (const { label, x, y, w, h } of townAttractionBases) {
    for (const px of [x + 1, x + w / 2, x + w - 1]) {
      const point = { x: px, y: y + h / 2 };
      assert.ok(canStand(point, terrain, s.bounds, s.floor, s.surfaces), `${label}: unsupported foot`);
      assert.ok(!canStand(point, s.walls, s.bounds, s.floor, s.surfaces), `${label}: missing collision`);
    }
  }
});

test("playground targets and neighbouring NPCs stay separately reachable", () => {
  const s = scenes.town;
  const neighbours = ["npc-hop-keeper", "npc-blocks-keeper", "npc-flight-keeper", "npc-snake-keeper", "npc-photo-visitor"];
  for (const spot of s.spots.filter(spot => neighbours.includes(spot.id) || townAttractionSpots.includes(spot))) {
    assert.deepEqual(findPath(s.spawn, spot.approach, s)?.at(-1), spot.approach, `${spot.id}: cannot walk up to it`);
    assert.equal(nearbyInteraction(spot.approach, s.spots)?.id, spot.id);
  }
  for (const spot of townAttractionSpots) {
    for (const { x, y, w, h } of spot.hitAreas!) {
      for (let px = x; px <= x + w; px++)
        for (let py = y; py <= y + h; py++)
          assert.equal(clickedInteraction({ x: px, y: py }, s.spots)?.id, spot.id);
    }
  }
});

test("both flight-ring openings and all the matching stones are walkable", () => {
  const s = scenes.town;
  for (const [x, top, bottom] of [[697, 435, 479], [755, 414, 452]]) {
    const near = { x, y: bottom }, far = { x, y: top };
    assert.ok(canTravelBetween(near, far, s));
    assert.ok(canTravelBetween(far, near, s));
    assert.equal(clickedInteraction(far, s.spots), undefined);
  }
  for (const { left, right } of wishPairs) {
    const a = { x: left.x, y: left.y - 9 }, b = { x: right.x, y: right.y - 9 };
    assert.ok(canTravelBetween(a, b, s));
    for (const p of [a, b]) assert.equal(clickedInteraction(p, s.spots)?.id, "arcade-link");
  }
});

test("the climb to the old mine stays between the memorial wall and the wooded bluff", () => {
  const s = scenes.town;
  for (const lane of [
    [[936,479],[948,431],[969,403],[978,383],[968,362],[959,335],[951,312],
      [969,290],[996,269],[1035,239],[1073,216],[1109,192],[1140,174],
      [1170,157],[1202,142],[1240,121],[1280,107],[1342,114]],
    [[1206,112],[1203,99],[1205,85],[1205,73],[1204,65],[1201,62],[1194,58],[1182,54]],
  ]) {
    for (let i = 1; i < lane.length; i++) {
      const [x,y] = lane[i - 1], [tx,ty] = lane[i];
      assert.ok(canTravelBetween({x,y},{x:tx,y:ty},s), `uphill lane blocked at ${x},${y}`);
    }
  }
  for (const [x,y] of [[1041,149],[1213,185],[1222,175],[935,247],[1042,196],[1161,124],[1219,97]]) {
    assert.equal(canStand({x,y},s.walls,s.bounds,s.floor,s.surfaces),false);
  }
  const cat = s.spots.find(spot => spot.id === "npc-cat")!;
  const street = {...s,walls:s.walls.filter(w => w.label !== "镇民 · 奶糖")};
  for (const direction of [-1,1])
    assert.ok(canTravelBetween(cat,{x:cat.x+direction*26,y:cat.y-direction*12},street));
});
test("the Moon Rabbit platforms and their keeper are accessible across the southeast curb in both directions",()=>{
  const s=scenes.town, street={x:572,y:644}, platform=s.spots.find(p=>p.id==="arcade-hop")!.approach;
  const sidewalk=[street,{x:546,y:638},{x:507,y:630},{x:477,y:623},platform];
  for(let i=1;i<sidewalk.length;i++) {
    assert.ok(canTravelBetween(sidewalk[i-1],sidewalk[i],s));
    assert.ok(canTravelBetween(sidewalk[i],sidewalk[i-1],s));
  }
  const keeper=s.spots.find(p=>p.id==="npc-hop-keeper")!.approach;
  assert.ok(canTravelBetween({x:566,y:640},keeper,s));
  for(const prop of [{x:544,y:620},{x:559,y:609},{x:583,y:592}])
    assert.ok(!canStand(prop,s.walls,s.bounds,s.floor,s.surfaces));
});

test("adjoining paved surfaces have no artificial seam, tiny planted gaps cannot be crossed", () => {
  const g = {
    bounds: { x: 0, y: 0, w: 100, h: 100 },
    walls: [],
    surfaces: [square(0, 50), square(50, 100)],
  };
  assert.equal(
    canStand({ x: 50, y: 50 }, g.walls, g.bounds, undefined, g.surfaces),
    true,
  );
  assert.equal(canTravelBetween({ x: 40, y: 50 }, { x: 60, y: 50 }, g), true);
  const gap = { ...g, surfaces: [square(0, 49.1), square(49.3, 100)] };
  assert.equal(
    canTravelBetween({ x: 40, y: 50 }, { x: 60, y: 50 }, gap),
    false,
  );
  const p = movePlayer(
    { x: 43.8, y: 50 },
    { x: 1, y: 0 },
    0.05,
    gap.walls,
    gap.bounds,
    undefined,
    gap.surfaces,
  );
  assert.ok(p.x < 44, "keyboard movement must also stop at the narrow gap");
});

test("town planted islands, the reported workshop roof and celebration furniture block feet", () => {
  const s = scenes.town;
  for (const [x, y] of [
    [1175, 227],
    [360, 380],
    [680, 600],
    [550, 880],
    [1360, 625],
  ])
    assert.equal(
      canStand({ x, y }, s.walls, s.bounds, s.floor, s.surfaces),
      false,
      `${x},${y} is scenery`,
    );
  for (const [x, y] of [
    [450, 960],
    [488, 357],
    [789, 319],
    [740, 550],
    [866, 811],
    [1330, 540],
    [794, 474],
  ])
    assert.equal(
      canStand({ x, y }, s.walls, s.bounds, s.floor, s.surfaces),
      true,
      `${x},${y} is paving`,
    );
});

test("tree occlusion silhouettes are separate from the roots, and anniversary props span multiple streets", () => {
  assert.ok(townCanopies.length >= 10);
  for (const t of townCanopies) {
    assert.ok(t.points.length >= 5);
    assert.ok(
      Math.max(...t.points.map((p) => p.y)) < t.y,
      "canopy sorts using its root, not its top edge",
    );
    assert.ok(
      t.points.every((p) => p.x >= 0 && p.x <= 1536 && p.y >= 0 && p.y <= 1024),
    );
  }
  assert.deepEqual(
    new Set(festivalProps.map((p) => p.kind)),
    new Set(["balloons", "garland"]),
  );
  assert.ok(canTravelBetween({x: 756, y: 474}, {x: 828, y: 474}, scenes.town), "the former cake stand must be clear across the plaza");
});
