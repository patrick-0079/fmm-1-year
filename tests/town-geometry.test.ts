import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, movePlayer } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { townCanopies, festivalProps } from "../src/town-scenery.ts";
import { townGates, gatePosts, crossedTownGate } from "../src/gate-layout.ts";
import { ARCADES } from "../src/town-data.ts";

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

test("the whole arcade counter stands on native open ground, away from fences and trees", () => {
  const s = scenes.town;
  for (const [id, g] of Object.entries(ARCADES)) {
    const terrain = s.walls.filter((w) => w.label !== g.title + "摊位");
    for (const dx of [-23, 0, 23])
      assert.ok(canStand({x:g.x+dx, y:g.y+12}, terrain, s.bounds, s.floor, s.surfaces), `${id}: unsupported counter foot ${dx}`);
    assert.ok(!canStand({x:g.x, y:g.y+10}, s.walls, s.bounds, s.floor, s.surfaces), `${id}: missing solid counter`);
  }
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
    [794, 474],
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
    new Set(["cake", "balloons", "garland"]),
  );
});
